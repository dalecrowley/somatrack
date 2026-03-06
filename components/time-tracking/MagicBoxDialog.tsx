'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { getIdToken } from '@/lib/firebase/auth';
import {
    Dialog,
    DialogContent,
} from '@/components/ui/dialog';
import { employeeSheets, projectAliases } from '@/lib/config/timeTracking';
import { parseTimeEntry, formatDateForSheet } from '@/lib/utils/timeEntryParser';
import {
    Clock,
    ExternalLink,
    Send,
    CheckCircle2,
    AlertTriangle,
    Loader2,
    Sparkles,
    RefreshCw,
    CalendarDays,
    X,
} from 'lucide-react';

interface MagicBoxDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

type SyncStatus = 'idle' | 'parsing' | 'syncing' | 'success' | 'conflict' | 'error';
type GridSyncStatus = 'idle' | 'syncing' | 'success' | 'error';

interface ConflictItem {
    project: string;
    existing: string | number;
    new: string | number;
}

interface ParsePreviewEntry {
    project: string;
    hours: number;
    isRaw?: boolean;
}

// All known projects from the config
const KNOWN_PROJECTS = [
    'Emoji',
    'Project Treasure',
    'CA Padilla',
    'CA Piglio',
    'Rainier',
    'PokemonGo',
    'Jupiter',
    'Somatone',
    'Project A',
    'Project B',
    'Project C',
];


function formatDateInput(dateStr: string): string {
    // Convert MM/DD/YYYY to YYYY-MM-DD for input[type=date]
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
    }
    return new Date().toISOString().split('T')[0];
}

function parseInputDate(isoDateStr: string): string {
    // Convert YYYY-MM-DD to M/D (no leading zeros, no year)
    // to match the format produced by formatDateForSheet and expected by the Google Sheets row lookup.
    const parts = isoDateStr.split('-');
    if (parts.length === 3) {
        const month = parseInt(parts[1], 10); // strip leading zero
        const day = parseInt(parts[2], 10);   // strip leading zero
        return `${month}/${day}`;
    }
    // fallback: today as M/D
    const d = new Date();
    return `${d.getMonth() + 1}/${d.getDate()}`;
}

interface ProjectEntry {
    project: string;
    hours: string;
    date: string; // ISO: YYYY-MM-DD
}

export default function MagicBoxDialog({ open, onOpenChange }: MagicBoxDialogProps) {
    const user = useAuthStore((state) => state.user);

    // === Magic Box state ===
    const [inputText, setInputText] = useState('');
    const [status, setStatus] = useState<SyncStatus>('idle');
    const [statusMessage, setStatusMessage] = useState('');
    const [previewEntries, setPreviewEntries] = useState<ParsePreviewEntry[]>([]);
    const [previewDate, setPreviewDate] = useState('');
    const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
    const [pendingBody, setPendingBody] = useState<object | null>(null);

    // === Grid state ===
    const todayIso = new Date().toISOString().split('T')[0];
    const [projectEntries, setProjectEntries] = useState<ProjectEntry[]>(
        KNOWN_PROJECTS.map((p) => ({ project: p, hours: '', date: todayIso }))
    );
    const [gridStatus, setGridStatus] = useState<GridSyncStatus>('idle');
    const [gridMessage, setGridMessage] = useState('');

    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const userEmail = user?.email ?? '';
    const sheetConfig = userEmail ? employeeSheets[userEmail] : null;
    const spreadsheetUrl = sheetConfig
        ? `https://docs.google.com/spreadsheets/d/${sheetConfig.spreadsheetId}`
        : null;

    // Live parse preview as user types
    useEffect(() => {
        if (!inputText.trim()) {
            setPreviewEntries([]);
            setPreviewDate('');
            return;
        }
        const parsed = parseTimeEntry(inputText, projectAliases);
        setPreviewEntries(parsed.entries);
        if (parsed.entries.length > 0) {
            setPreviewDate(formatDateForSheet(parsed.date));
        } else {
            setPreviewDate('');
        }
    }, [inputText]);

    // Auto-focus textarea when dialog opens
    useEffect(() => {
        if (open) {
            setTimeout(() => textareaRef.current?.focus(), 100);
            setStatus('idle');
            setStatusMessage('');
            setConflicts([]);
            setPendingBody(null);
            setGridStatus('idle');
            setGridMessage('');
            // Reset grid entries to today
            const iso = new Date().toISOString().split('T')[0];
            setProjectEntries(KNOWN_PROJECTS.map((p) => ({ project: p, hours: '', date: iso })));
        } else {
            setInputText('');
            setPreviewEntries([]);
            setPreviewDate('');
        }
    }, [open]);

    // When magic box parses, auto-fill the grid
    useEffect(() => {
        if (status === 'success' && previewEntries.length === 0) return;
        if (previewEntries.length > 0 && inputText) {
            const parsed = parseTimeEntry(inputText, projectAliases);
            const isoDate = parsed.date.toISOString().split('T')[0];
            setProjectEntries((prev) =>
                prev.map((entry) => {
                    const match = parsed.entries.find(
                        (e) => e.project.toLowerCase() === entry.project.toLowerCase()
                    );
                    if (match) {
                        return { ...entry, hours: String(match.hours), date: isoDate };
                    }
                    return entry;
                })
            );
        }
    }, [previewEntries]);

    // === Magic Box Submit ===
    const submitEntry = useCallback(async (body: object) => {
        setStatus('syncing');
        setStatusMessage('Syncing to Google Sheets...');
        setConflicts([]);

        try {
            const token = await getIdToken();
            const res = await fetch('/api/time-entry', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body),
            });

            const data = await res.json();

            if (res.status === 409 && data.requiresConfirmation) {
                setStatus('conflict');
                setStatusMessage('Existing entries found. Overwrite?');
                setConflicts(data.conflicts || []);
                setPendingBody(body);
                return;
            }

            if (!res.ok) {
                setStatus('error');
                setStatusMessage(data.error || 'An unexpected error occurred.');
                return;
            }

            setStatus('success');
            setStatusMessage(
                `✓ Logged ${data.updatedCount} entr${data.updatedCount === 1 ? 'y' : 'ies'} for ${data.date}`
            );
            setInputText('');
        } catch (err: any) {
            setStatus('error');
            setStatusMessage(err.message || 'Network error. Please try again.');
        }
    }, []);

    const handleMagicSubmit = async () => {
        if (!inputText.trim() || !userEmail) return;
        setStatus('parsing');
        setStatusMessage('Parsing your entry...');
        await new Promise((r) => setTimeout(r, 300));
        const body = { text: inputText, userEmail, ignoreConflicts: false };
        await submitEntry(body);
    };

    const handleOverwrite = async () => {
        if (!pendingBody) return;
        await submitEntry({ ...(pendingBody as any), ignoreConflicts: true });
    };

    const handleMagicKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleMagicSubmit();
        }
    };

    // === Grid Submit (bulk) ===
    const handleGridSync = async () => {
        if (!userEmail || !sheetConfig) return;

        const filledEntries = projectEntries.filter((e) => e.hours.trim() !== '' && parseFloat(e.hours) > 0);
        if (filledEntries.length === 0) {
            setGridStatus('error');
            setGridMessage('Please enter hours for at least one project.');
            return;
        }

        setGridStatus('syncing');
        setGridMessage('Syncing all entries to Google Sheets...');

        try {
            const token = await getIdToken();
            const res = await fetch('/api/time-entry/bulk', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    userEmail,
                    entries: filledEntries.map((e) => ({
                        project: e.project,
                        hours: parseFloat(e.hours),
                        date: parseInputDate(e.date),
                    })),
                    ignoreConflicts: true,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setGridStatus('error');
                setGridMessage(data.error || 'An unexpected error occurred.');
                return;
            }

            setGridStatus('success');
            setGridMessage(`✓ Synced ${data.updatedCount} entr${data.updatedCount === 1 ? 'y' : 'ies'} to Google Sheets`);
        } catch (err: any) {
            setGridStatus('error');
            setGridMessage(err.message || 'Network error. Please try again.');
        }
    };

    const updateProjectHours = (project: string, hours: string) => {
        setProjectEntries((prev) =>
            prev.map((e) => (e.project === project ? { ...e, hours } : e))
        );
        setGridStatus('idle');
        setGridMessage('');
    };

    const updateProjectDate = (project: string, date: string) => {
        setProjectEntries((prev) =>
            prev.map((e) => (e.project === project ? { ...e, date } : e))
        );
        setGridStatus('idle');
        setGridMessage('');
    };

    const isSubmitting = status === 'parsing' || status === 'syncing';
    const isGridSyncing = gridStatus === 'syncing';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent showCloseButton={false} className="time-tracker-dialog p-0 overflow-hidden border-0 max-h-[92vh] flex flex-col" style={{ maxWidth: '740px', width: '95vw' }}>

                {/* ── Top Bar ─────────────────────────────── */}
                <div className="tt-topbar px-5 pt-5 pb-4 flex-shrink-0">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="tt-icon-wrap">
                                <Clock size={18} className="text-white" />
                            </div>
                            <div>
                                <h2 className="tt-title">Time Tracker</h2>
                                <p className="tt-subtitle">
                                    {sheetConfig
                                        ? `${sheetConfig.name} · 2026 Time Tracking`
                                        : 'No sheet configured for your account.'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {spreadsheetUrl && (
                                <a
                                    href={spreadsheetUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="tt-sheet-link"
                                    title="Open Google Sheet"
                                >
                                    <ExternalLink size={14} />
                                </a>
                            )}
                            <button
                                className="tt-close-btn"
                                onClick={() => onOpenChange(false)}
                                aria-label="Close"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Magic Box */}
                    <div className="tt-magic-section">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <Sparkles size={13} className="text-indigo-400 opacity-70" />
                                <span className="tt-section-label">Quick Entry</span>
                            </div>
                            <span className="tt-hint">⌘↵ to sync</span>
                        </div>
                        <div className={`tt-magic-wrap ${isSubmitting ? 'is-submitting' : ''}`}>
                            <textarea
                                ref={textareaRef}
                                className="tt-magic-input"
                                placeholder={`Magic Box: 'Treasure 4, Emoji 2'`}
                                rows={2}
                                value={inputText}
                                onChange={(e) => {
                                    setInputText(e.target.value);
                                    setStatus('idle');
                                    setStatusMessage('');
                                    setConflicts([]);
                                }}
                                onKeyDown={handleMagicKeyDown}
                                disabled={isSubmitting}
                            />
                            <button
                                className="tt-magic-send"
                                disabled={isSubmitting || !inputText.trim() || !sheetConfig}
                                onClick={handleMagicSubmit}
                                title="Sync to Sheets"
                            >
                                {isSubmitting ? (
                                    <Loader2 size={14} className="animate-spin" />
                                ) : (
                                    <Send size={14} />
                                )}
                            </button>
                        </div>

                        {/* Preview chips */}
                        {previewEntries.length > 0 && status === 'idle' && (
                            <div className="tt-preview-chips">
                                <span className="tt-preview-date">{previewDate}</span>
                                {previewEntries.map((e) => (
                                    <span
                                        key={e.project}
                                        className={`tt-chip ${e.isRaw ? 'tt-chip-warn' : 'tt-chip-ok'}`}
                                    >
                                        <strong>{e.hours}h</strong>&nbsp;{e.project}
                                        {e.isRaw && <AlertTriangle size={10} className="ml-1 opacity-70" />}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Status / conflict */}
                        {status !== 'idle' && (
                            <div className={`tt-status tt-status-${status}`}>
                                {(status === 'parsing' || status === 'syncing') && <Loader2 size={13} className="animate-spin flex-shrink-0" />}
                                {status === 'success' && <CheckCircle2 size={13} className="flex-shrink-0" />}
                                {(status === 'error' || status === 'conflict') && <AlertTriangle size={13} className="flex-shrink-0" />}
                                <span>{statusMessage}</span>
                                {status === 'conflict' && (
                                    <div className="flex gap-2 ml-auto">
                                        <button className="tt-overwrite-btn" onClick={handleOverwrite}>
                                            <RefreshCw size={11} /> Overwrite
                                        </button>
                                        <button className="tt-cancel-btn" onClick={() => { setStatus('idle'); setConflicts([]); }}>
                                            Cancel
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Conflict details */}
                        {status === 'conflict' && conflicts.length > 0 && (
                            <div className="tt-conflict-list">
                                {conflicts.map((c) => (
                                    <div key={c.project} className="tt-conflict-row">
                                        <span className="tt-conflict-proj">{c.project}</span>
                                        <span className="tt-conflict-old">{c.existing}h</span>
                                        <span className="tt-conflict-arrow">→</span>
                                        <span className="tt-conflict-new">{c.new}h</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Project Grid ─────────────────────────── */}
                <div className="tt-grid-section flex-1 overflow-y-auto px-5 pb-4">
                    <div className="grid grid-cols-2 gap-3">
                        {projectEntries.map((entry) => (
                            <div key={entry.project} className="tt-project-card">
                                <p className="tt-project-name">{entry.project}</p>
                                <div className="tt-card-inputs">
                                    <div className="tt-hours-wrap">
                                        <input
                                            type="number"
                                            min="0"
                                            max="24"
                                            step="0.5"
                                            className="tt-hours-input"
                                            placeholder="Hours"
                                            value={entry.hours}
                                            onChange={(e) => updateProjectHours(entry.project, e.target.value)}
                                        />
                                        <span className="tt-hrs-label">HRS</span>
                                    </div>
                                    <div className="tt-date-wrap">
                                        <CalendarDays size={12} className="tt-date-icon" />
                                        <input
                                            type="date"
                                            className="tt-date-input"
                                            value={entry.date}
                                            onChange={(e) => updateProjectDate(entry.project, e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Grid Sync Status ──────────────────────── */}
                {gridStatus !== 'idle' && (
                    <div className={`tt-grid-status tt-grid-status-${gridStatus} px-5 py-2 flex-shrink-0`}>
                        {gridStatus === 'syncing' && <Loader2 size={13} className="animate-spin flex-shrink-0" />}
                        {gridStatus === 'success' && <CheckCircle2 size={13} className="flex-shrink-0" />}
                        {gridStatus === 'error' && <AlertTriangle size={13} className="flex-shrink-0" />}
                        <span>{gridMessage}</span>
                    </div>
                )}

                {/* ── Sync Button ───────────────────────────── */}
                <div className="tt-footer flex-shrink-0">
                    <button
                        className="tt-sync-btn"
                        onClick={handleGridSync}
                        disabled={isGridSyncing || !sheetConfig}
                    >
                        {isGridSyncing ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <Send size={16} />
                        )}
                        {isGridSyncing ? 'Syncing...' : 'Sync all entries to Google Sheets'}
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
