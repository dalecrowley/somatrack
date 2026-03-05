import { google } from 'googleapis';
import { readFile } from 'fs/promises';
import { TimeEntryInfo } from '../utils/timeEntryParser';
import path from 'path';

let sheetsClient: any = null;

export async function initializeSheets() {
    if (sheetsClient) return true;

    try {
        // Path adjusted for standard Next.js directory structure where process.cwd() is the project root
        const keyPath = path.join(process.cwd(), 'google-credentials.json');
        const keyFile = await readFile(keyPath, 'utf-8');
        const credentials = JSON.parse(keyFile);

        const auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        sheetsClient = google.sheets({ version: 'v4', auth });
        console.log('✅ Google Sheets API initialized');
        return true;
    } catch (error: any) {
        console.error('❌ Failed to initialize Google Sheets:', error.message);
        throw error;
    }
}

export async function getSpreadsheetDetails(spreadsheetId: string) {
    await initializeSheets();
    if (!sheetsClient) throw new Error('Sheets client not initialized');

    try {
        const trimmedId = spreadsheetId.trim().replace(/^["']|["']$/g, '');
        const response = await sheetsClient.spreadsheets.get({
            spreadsheetId: trimmedId
        });

        const sheetName = response.data.sheets[0].properties.title;

        // Fetch row 2 to get project names
        const valuesResponse = await sheetsClient.spreadsheets.values.get({
            spreadsheetId,
            range: `${sheetName}!A2:Z2`,
        });

        const row2 = valuesResponse.data.values ? valuesResponse.data.values[0] : [];
        const projects: { name: string, column: string }[] = [];

        // Map columns D (index 3) through Z to project names
        for (let i = 3; i < row2.length; i++) {
            if (row2[i] && row2[i].trim()) {
                projects.push({
                    name: row2[i].trim(),
                    column: String.fromCharCode(65 + i) // Convert 0-indexed to A, B, C...
                });
            }
        }

        return {
            title: response.data.properties.title,
            sheetName,
            projects
        };
    } catch (error: any) {
        console.error('❌ Failed to fetch spreadsheet details:', error.message);
        throw error;
    }
}

async function findDateRow(spreadsheetId: string, sheetName: string, dateStr: string) {
    if (!sheetsClient) throw new Error('Sheets client not initialized');

    // Find the row for the date
    const response = await sheetsClient.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!B:B`,
    });

    const rows = response.data.values || [];
    let rowNumber = -1;

    const normalizeDate = (d: string) => d.split('/').map((v: string) => parseInt(v, 10)).join('/');
    const targetDateNormalized = normalizeDate(dateStr);

    for (let i = 2; i < rows.length; i++) {
        const cellValue = rows[i][0];
        if (!cellValue) continue;
        const cleanCellValue = cellValue.toString().trim();

        // Try simple string matches first
        if (cleanCellValue === dateStr ||
            cleanCellValue.startsWith(dateStr + '/') ||
            dateStr.startsWith(cleanCellValue + '/')) {
            rowNumber = i + 1;
            break;
        }

        // Try normalized matching (handles 1/5 vs 01/05)
        try {
            const rowDateParts = cleanCellValue.split(/[\/\- ]/);
            if (rowDateParts.length >= 2) {
                const rowDateNormalized = `${parseInt(rowDateParts[0], 10)}/${parseInt(rowDateParts[1], 10)}`;
                if (rowDateNormalized === targetDateNormalized) {
                    // Assume 2026 for now, or matching whatever year it finds
                    if (rowDateParts[2]) {
                        const year = rowDateParts[2].length === 2 ? '20' + rowDateParts[2] : rowDateParts[2];
                        if (year !== '2026') continue;
                    }
                    rowNumber = i + 1;
                    break;
                }
            }
        } catch (e) {
            // Skip invalid dates
        }
    }

    if (rowNumber === -1) {
        const firstDates = rows.slice(2, 12).map((r: any) => r[0]).filter(Boolean).join(', ');
        throw new Error(`Date "${dateStr}" not found in 2026. Column B values start with: ${firstDates}`);
    }
    return rowNumber;
}

export async function checkConflicts(spreadsheetId: string, sheetName: string, dateStr: string, entries: TimeEntryInfo[], columnMapping: Record<string, string>) {
    await initializeSheets();
    if (!sheetsClient) throw new Error('Sheets client not initialized');

    const rowNumber = await findDateRow(spreadsheetId, sheetName, dateStr);

    // Fetch the entire row (A to Z) for this date
    const response = await sheetsClient.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A${rowNumber}:Z${rowNumber}`,
    });

    const rowValues = response.data.values ? response.data.values[0] : [];
    const conflicts = [];

    for (const entry of entries) {
        const column = columnMapping[entry.project];
        if (column) {
            const colIndex = column.charCodeAt(0) - 65; // A=0, B=1...
            const existingValue = rowValues[colIndex];
            if (existingValue && existingValue.trim() !== '') {
                conflicts.push({
                    project: entry.project,
                    existing: existingValue,
                    new: entry.hours
                });
            }
        }
    }

    return { rowNumber, conflicts };
}

export async function updateTimeEntry(spreadsheetId: string, sheetName: string, dateStr: string, entries: TimeEntryInfo[], columnMapping: Record<string, string>) {
    await initializeSheets();
    if (!sheetsClient) throw new Error('Sheets client not initialized');

    const rowNumber = await findDateRow(spreadsheetId, sheetName, dateStr);

    const updates = [];
    for (const entry of entries) {
        const column = columnMapping[entry.project];
        if (column) {
            updates.push({
                range: `${sheetName}!${column}${rowNumber}`,
                values: [[entry.hours]]
            });
        }
    }

    if (updates.length > 0) {
        await sheetsClient.spreadsheets.values.batchUpdate({
            spreadsheetId,
            resource: {
                valueInputOption: 'USER_ENTERED',
                data: updates
            }
        });
    }

    return { success: true, updatedCount: updates.length };
}
