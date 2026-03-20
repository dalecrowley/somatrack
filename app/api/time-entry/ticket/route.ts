import { NextResponse } from 'next/server';
import { employeeSheets, projectAliases } from '@/lib/config/timeTracking';
import { getSpreadsheetDetails, addTimeEntry } from '@/lib/services/googleSheets';
import { verifySession } from '@/lib/api/auth';
import { db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';

/**
 * POST /api/time-entry/ticket
 *
 * Logs time from the ticket time-tracker to the user's Google Sheet
 * using ADDITIVE mode (existing hours + new hours).
 *
 * Body: { userUid, date (ISO YYYY-MM-DD), hours (number), project (string) }
 *
 * Project name matching is fuzzy:
 *   1. Exact match (case-insensitive)
 *   2. projectAliases config lookup
 *   3. Sheet column is a prefix/substring of the project name  (e.g. "Emoji" → "Emoji Blitz")
 *   4. Project name is a prefix/substring of the sheet column
 *   5. Word-overlap scoring — picks the column whose words overlap most
 *
 * If no matching column is found the entry is still saved to Firestore (200 with sheetSynced:false).
 */

/** ── Fuzzy project → sheet-column resolver ─────────────────────────────── */
interface SheetProject { name: string; column: string; }

function resolveColumn(
    rawProjectName: string,
    sheetProjects: SheetProject[],
    aliases: Record<string, string>
): { column: string; matchedName: string } | null {
    const input = rawProjectName.trim().toLowerCase();

    // 1️⃣  Exact match against sheet column names or aliases
    for (const sp of sheetProjects) {
        if (sp.name.toLowerCase() === input) return { column: sp.column, matchedName: sp.name };
    }

    // 2️⃣  Alias config: normalize via projectAliases first
    const aliasCanonical = aliases[input];
    if (aliasCanonical) {
        const sp = sheetProjects.find(p => p.name.toLowerCase() === aliasCanonical.toLowerCase());
        if (sp) return { column: sp.column, matchedName: sp.name };
    }
    // Also try all alias keys against partial matches
    for (const [alias, canonical] of Object.entries(aliases)) {
        if (input.includes(alias) || alias.includes(input)) {
            const sp = sheetProjects.find(p => p.name.toLowerCase() === canonical.toLowerCase());
            if (sp) return { column: sp.column, matchedName: sp.name };
        }
    }

    // 3️⃣  Sheet column name is a prefix of the project name
    //      "Emoji" → matches "Emoji Blitz", "Emoji DLC", etc.
    for (const sp of sheetProjects) {
        const colLower = sp.name.toLowerCase();
        if (input.startsWith(colLower) || input.includes(colLower)) {
            return { column: sp.column, matchedName: sp.name };
        }
    }

    // 4️⃣  Project name is a prefix of the sheet column name
    for (const sp of sheetProjects) {
        const colLower = sp.name.toLowerCase();
        if (colLower.startsWith(input) || colLower.includes(input)) {
            return { column: sp.column, matchedName: sp.name };
        }
    }

    // 5️⃣  Best word-overlap score
    //      "Somatone 2" → words: ["somatone", "2"]
    //      "Somatone"   → words: ["somatone"]   overlap = 1  ← winner
    const inputWords = input.split(/\s+/).filter(w => w.length > 2); // ignore noise words
    if (inputWords.length === 0) return null;

    let bestScore = 0;
    let bestMatch: SheetProject | null = null;

    for (const sp of sheetProjects) {
        const colWords = sp.name.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        let score = 0;
        for (const iw of inputWords) {
            for (const cw of colWords) {
                if (iw === cw) { score += 2; continue; }          // exact word match
                if (iw.startsWith(cw) || cw.startsWith(iw)) score += 1; // prefix word match
            }
        }
        if (score > bestScore) { bestScore = score; bestMatch = sp; }
    }

    if (bestScore > 0 && bestMatch) {
        return { column: bestMatch.column, matchedName: bestMatch.name };
    }

    return null;
}

export async function POST(request: Request) {
    const { user, errorResponse } = await verifySession(request);
    if (errorResponse) return errorResponse;

    try {
        const body = await request.json();
        const {
            userUid,
            date,      // ISO YYYY-MM-DD
            hours,
            project,
        } = body as {
            userUid: string;
            date: string;
            hours: number;
            project: string;
        };

        if (!userUid || !date || !hours || !project) {
            return NextResponse.json(
                { error: 'userUid, date, hours, and project are required' },
                { status: 400 }
            );
        }

        // Only allow logging for yourself (unless admin)
        if (user!.uid !== userUid && user!.role !== 'admin') {
            return NextResponse.json(
                { error: 'Forbidden: you can only log time for your own account' },
                { status: 403 }
            );
        }

        // ── Resolve spreadsheet -------------------------------------------------
        let spreadsheetId: string | null = user!.spreadsheetId ?? null;
        let sheetName = '2026';

        // Fall back to Firestore user doc
        if (!spreadsheetId && userUid) {
            try {
                const snap = await getDoc(doc(db, 'users', userUid));
                if (snap.exists()) {
                    const data = snap.data();
                    spreadsheetId = data.spreadsheetId ?? null;
                }
            } catch (_) { /* ignore */ }
        }

        // Fall back to hardcoded config keyed by email
        if (!spreadsheetId && user!.email) {
            const cfg = employeeSheets[user!.email];
            if (cfg) {
                spreadsheetId = cfg.spreadsheetId;
                sheetName = cfg.sheetName;
            }
        }

        if (!spreadsheetId) {
            return NextResponse.json(
                { success: false, sheetSynced: false, message: 'No spreadsheet linked to your account. Time saved to ticket only.' },
                { status: 206 }
            );
        }

        // ── Fetch sheet metadata ------------------------------------------------
        const details = await getSpreadsheetDetails(spreadsheetId);

        // Build a flat column mapping for addTimeEntry (needs exact key lookup)
        const columnMapping: Record<string, string> = {};
        details.projects.forEach((p) => {
            columnMapping[p.name.toLowerCase()] = p.column;
            columnMapping[p.name] = p.column;
        });

        // ── Fuzzy-resolve which column to write to ───────────────────────────────
        const resolved = resolveColumn(project, details.projects, projectAliases);

        if (!resolved) {
            const known = details.projects.map(p => p.name).join(', ');
            return NextResponse.json(
                {
                    success: false,
                    sheetSynced: false,
                    message: `Could not match "${project}" to a column. Known columns: ${known}. Time saved to ticket only.`,
                },
                { status: 206 }
            );
        }

        // Convert YYYY-MM-DD → M/D (sheet format)
        const [, month, day] = date.split('-');
        const dateStr = `${parseInt(month, 10)}/${parseInt(day, 10)}`;

        // Use the resolved canonical column name (lowercase, matching the mapping)
        const entry = { project: resolved.matchedName.toLowerCase(), hours };

        // ── Additive write to sheet ---------------------------------------------
        const result = await addTimeEntry(
            spreadsheetId,
            details.sheetName || sheetName,
            dateStr,
            [entry],
            columnMapping
        );

        return NextResponse.json({
            success: true,
            sheetSynced: true,
            matchedColumn: resolved.matchedName,   // helpful for debugging / UI
            updatedCount: result.updatedCount,
            date: dateStr,
            spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
        });

    } catch (error: any) {
        console.error('Ticket time-entry API error:', error);
        return NextResponse.json(
            { error: error.message || 'An unexpected error occurred' },
            { status: 500 }
        );
    }
}
