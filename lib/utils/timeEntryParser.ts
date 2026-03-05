import * as chrono from 'chrono-node';

export interface TimeEntryInfo {
    project: string;
    hours: number;
    isRaw?: boolean;
}

export interface ParseResult {
    date: Date;
    entries: TimeEntryInfo[];
    error: string | null;
}

/**
 * Parse natural language time entry text
 * Supports formats like:
 * - "3 hours on Project Treasure, 2h CA Padilla"
 * - "today: 4h Rainier"
 * - "yesterday 2.5 hours Maui"
 * 
 * @param text - The message text to parse
 * @param projectAliases - Mapping of aliases to canonical names
 */
export function parseTimeEntry(text: string, projectAliases: Record<string, string> = {}): ParseResult {
    const result: ParseResult = {
        date: new Date(),
        entries: [],
        error: null
    };

    if (!text) return result;

    // Parse date from text (supports "today", "yesterday", specific dates)
    const parsedResults = chrono.parse(text);
    let textToParseForEntries = text;

    if (parsedResults.length > 0) {
        const firstMatch = parsedResults[0].start.date();
        if (firstMatch) {
            result.date = firstMatch;
        }

        // Sort results by index descending to remove without affecting earlier indices
        const sorted = [...parsedResults].sort((a, b) => b.index - a.index);
        for (const res of sorted) {
            const before = textToParseForEntries.substring(0, res.index);
            const after = textToParseForEntries.substring(res.index + res.text.length);
            textToParseForEntries = before + " " + after;
        }
    }

    // Regular expression patterns for extracting time entries
    const patterns = [
        // Pattern: "3 hours Project Name" or "3h Project Name"
        /(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\s+(?:on\s+)?([a-z\s0-9]+?)(?=,|\d|$)/gi,
        // Pattern: "Project Name: 3 hours" or "Project Name 3h"
        /([a-z\s0-9]+?)[\s:]+(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)/gi,
        // Simple Pattern: "Project Name 3" (if we have a list of projects to check against)
        /([a-z\s0-9]+?)\s+(\d+(?:\.\d+)?)(?=\s|,|$)/gi
    ];

    let matches: TimeEntryInfo[] = [];

    for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(textToParseForEntries)) !== null) {
            let hours: number | undefined;
            let project: string | undefined;

            if (match[1] && !isNaN(parseFloat(match[1]))) {
                // First group is hours
                const possibleHours = parseFloat(match[1]);
                if (isNaN(possibleHours)) continue;
                hours = possibleHours;
                project = match[2];
            } else {
                // Second group is hours
                const possibleHours = parseFloat(match[2]);
                if (isNaN(possibleHours)) continue;
                hours = possibleHours;
                project = match[1];
            }

            if (!project || hours === undefined) continue;
            project = project.trim().toLowerCase();

            // Match against project aliases
            const canonicalProject = projectAliases[project] || findClosestProject(project, projectAliases);

            if (canonicalProject) {
                matches.push({ project: canonicalProject, hours });
            } else {
                // If no alias found, we still keep it as a raw project name to show in UI
                matches.push({ project: project, hours, isRaw: true });
            }
        }
    }

    // Remove duplicates (keep last entry for each project)
    const projectMap = new Map<string, TimeEntryInfo>();
    matches.forEach(entry => {
        projectMap.set(entry.project, entry);
    });

    result.entries = Array.from(projectMap.values());

    if (result.entries.length === 0) {
        result.error = "Try: 'Emoji 4' or 'Project Treasure: 3h'";
    }

    return result;
}

function findClosestProject(input: string, aliases: Record<string, string>): string | null {
    const inputLower = input.toLowerCase();

    if (aliases[inputLower]) return aliases[inputLower];

    for (const [alias, canonical] of Object.entries(aliases)) {
        if (alias.includes(inputLower) || inputLower.includes(alias)) {
            return canonical;
        }
    }

    return null;
}

export function formatDateForSheet(date: Date): string {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}/${day}`;
}
