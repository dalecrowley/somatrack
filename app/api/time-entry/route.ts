import { NextResponse } from 'next/server';
import { parseTimeEntry, formatDateForSheet } from '@/lib/utils/timeEntryParser';
import { employeeSheets, projectAliases } from '@/lib/config/timeTracking';
import { getSpreadsheetDetails, updateTimeEntry, checkConflicts } from '@/lib/services/googleSheets';
import { verifySession } from '@/lib/api/auth';

export async function POST(request: Request) {
    const { user, errorResponse } = await verifySession(request);
    if (errorResponse) return errorResponse;

    try {
        const body = await request.json();
        const { text, userEmail, ignoreConflicts } = body;

        if (!text || !userEmail) {
            return NextResponse.json({ error: 'Text and userEmail are required' }, { status: 400 });
        }

        // Security check: Ensure the user is only logging time for themselves
        if (user!.email !== userEmail && user!.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden: You can only log time for your own account' }, { status: 403 });
        }

        // 1. Look up user's spreadsheet configuration
        // Prioritize the spreadsheetId from the user's Firestore document
        let spreadsheetId = user!.spreadsheetId;
        let sheetName = '2026'; // Default sheet name

        if (!spreadsheetId) {
            const sheetConfig = employeeSheets[userEmail];
            if (sheetConfig) {
                spreadsheetId = sheetConfig.spreadsheetId;
                sheetName = sheetConfig.sheetName;
            }
        }

        if (!spreadsheetId) {
            return NextResponse.json({
                error: `No spreadsheet configured for email: ${userEmail}. Please contact an administrator.`
            }, { status: 404 });
        }

        // 2. Parse the natural language entry
        const parsed = parseTimeEntry(text, projectAliases);

        if (parsed.error && parsed.entries.length === 0) {
            return NextResponse.json({ error: parsed.error }, { status: 422 });
        }

        // 3. Get Spreadsheet Details to map columns
        const details = await getSpreadsheetDetails(spreadsheetId);

        // Create a mapping of project name -> column
        const columnMapping: Record<string, string> = {};
        details.projects.forEach(p => {
            // Need to match aliases to exact string or lowercased string
            const projLower = p.name.toLowerCase();
            columnMapping[projLower] = p.column;
            columnMapping[p.name] = p.column;

            // Also add standard aliases for this project to point to the same column
            const alias = Object.keys(projectAliases).find(k => projectAliases[k] === p.name);
            if (alias) {
                columnMapping[alias] = p.column;
            }
        });

        // For each entry, try to ensure we have a column mapping
        // We know parser returns canoncial project names mapped from aliases.
        const validEntries = parsed.entries.filter(e => {
            return !!columnMapping[e.project] || !!columnMapping[e.project.toLowerCase()];
        });

        if (validEntries.length === 0) {
            return NextResponse.json({
                error: 'Could not match any recognized projects in your entry to columns in your spreadsheet.',
                details: parsed.entries
            }, { status: 422 });
        }

        // Add proper mapping for the exact projects so updateTimeEntry can find it
        validEntries.forEach(e => {
            e.project = e.project.toLowerCase(); // standardize for mapping lookup
        });

        const dateStr = formatDateForSheet(parsed.date);

        // 4. Check for conflicts if we aren't explicitly ignoring them
        if (!ignoreConflicts) {
            const conflictData = await checkConflicts(
                spreadsheetId,
                details.sheetName || sheetName,
                dateStr,
                validEntries,
                columnMapping
            );

            if (conflictData.conflicts.length > 0) {
                return NextResponse.json({
                    requiresConfirmation: true,
                    conflicts: conflictData.conflicts,
                    dateInfo: dateStr,
                    message: `Found existing entries. Do you want to overwrite?`
                }, { status: 409 });
            }
        }

        // 5. Update the sheet
        const result = await updateTimeEntry(
            spreadsheetId,
            details.sheetName || sheetName,
            dateStr,
            validEntries,
            columnMapping
        );

        return NextResponse.json({
            success: true,
            updatedCount: result.updatedCount,
            entries: validEntries,
            date: dateStr,
            spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`
        });

    } catch (error: any) {
        console.error('Time entry API error:', error);
        return NextResponse.json(
            { error: error.message || 'An unexpected error occurred' },
            { status: 500 }
        );
    }
}
