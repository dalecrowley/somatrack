import { NextResponse } from 'next/server';
import { employeeSheets } from '@/lib/config/timeTracking';
import { getSpreadsheetDetails, updateTimeEntry } from '@/lib/services/googleSheets';
import { verifySession } from '@/lib/api/auth';

interface BulkEntry {
    project: string;
    hours: number;
    date: string; // MM/DD/YYYY
}

export async function POST(request: Request) {
    const { user, errorResponse } = await verifySession(request);
    if (errorResponse) return errorResponse;

    try {
        const body = await request.json();
        const { userEmail, entries, ignoreConflicts } = body as {
            userEmail: string;
            entries: BulkEntry[];
            ignoreConflicts?: boolean;
        };

        if (!userEmail || !entries || !Array.isArray(entries) || entries.length === 0) {
            return NextResponse.json({ error: 'userEmail and entries[] are required' }, { status: 400 });
        }

        // Security check: Ensure the user is only logging time for themselves
        if (user!.email !== userEmail && user!.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden: You can only log time for your own account' }, { status: 403 });
        }

        // Look up spreadsheet ID
        let spreadsheetId = user!.spreadsheetId;
        let sheetName = '2026';

        if (!spreadsheetId) {
            const sheetConfig = employeeSheets[userEmail];
            if (sheetConfig) {
                spreadsheetId = sheetConfig.spreadsheetId;
                sheetName = sheetConfig.sheetName;
            }
        }

        if (!spreadsheetId) {
            return NextResponse.json({
                error: `No spreadsheet configured for email: ${userEmail}.`
            }, { status: 404 });
        }

        // Get spreadsheet column map once
        const details = await getSpreadsheetDetails(spreadsheetId);

        const columnMapping: Record<string, string> = {};
        details.projects.forEach((p) => {
            columnMapping[p.name.toLowerCase()] = p.column;
            columnMapping[p.name] = p.column;
        });

        // Group entries by date
        const byDate = new Map<string, BulkEntry[]>();
        for (const entry of entries) {
            const group = byDate.get(entry.date) ?? [];
            group.push(entry);
            byDate.set(entry.date, group);
        }

        let totalUpdated = 0;
        const errors: string[] = [];

        for (const [date, dateEntries] of byDate.entries()) {
            const validEntries = dateEntries
                .filter((e) => !!columnMapping[e.project] || !!columnMapping[e.project.toLowerCase()])
                .map((e) => ({ project: e.project.toLowerCase(), hours: e.hours }));

            if (validEntries.length === 0) continue;

            try {
                const result = await updateTimeEntry(
                    spreadsheetId,
                    details.sheetName || sheetName,
                    date,
                    validEntries,
                    columnMapping
                );
                totalUpdated += result.updatedCount;
            } catch (err: any) {
                errors.push(`${date}: ${err.message}`);
            }
        }

        if (errors.length > 0 && totalUpdated === 0) {
            return NextResponse.json({ error: errors.join('; ') }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            updatedCount: totalUpdated,
            errors: errors.length > 0 ? errors : undefined,
            spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
        });

    } catch (error: any) {
        console.error('Bulk time entry API error:', error);
        return NextResponse.json(
            { error: error.message || 'An unexpected error occurred' },
            { status: 500 }
        );
    }
}
