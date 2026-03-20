'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { TimeEntry } from '@/types';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { useUsers } from '@/hooks/useUsers';
import { getIdToken } from '@/lib/firebase/auth';
import { Button } from '@/components/ui/button';
import {
    Clock, Play, Square, Plus, X, Check,
    ChevronDown, Trash2, CheckCircle2, AlertTriangle, Loader2, ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TicketTimeTrackingProps {
    ticketId: string;
    projectId: string;
    /** The canonical project name used to match a column in Google Sheets */
    projectName?: string;
    timeEntries: TimeEntry[];
    onSave: (entries: TimeEntry[]) => void;
}

type Mode = 'idle' | 'log' | 'timer';
type SyncState = 'idle' | 'syncing' | 'success' | 'error' | 'no-sheet';

function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(1, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function hoursToDisplay(h: number): string {
    if (h === 0) return '0h';
    const whole = Math.floor(h);
    const mins = Math.round((h - whole) * 60);
    if (mins === 0) return `${whole}h`;
    return `${whole}h ${mins}m`;
}

/** Parse "2h", "1.5", "90m" etc into a decimal hours number */
function parseHoursInput(raw: string): number {
    const s = raw.trim().toLowerCase();
    // match e.g. "2h30m", "2h", "30m", "1.5"
    const hMatch = s.match(/^(\d+(?:\.\d+)?)h(?:(\d+)m)?$/);
    if (hMatch) {
        const h = parseFloat(hMatch[1]);
        const m = hMatch[2] ? parseInt(hMatch[2], 10) : 0;
        return h + m / 60;
    }
    const mOnlyMatch = s.match(/^(\d+)m$/);
    if (mOnlyMatch) return parseInt(mOnlyMatch[1], 10) / 60;
    const plain = parseFloat(s);
    return isNaN(plain) ? NaN : plain;
}

export function TicketTimeTracking({
    ticketId,
    projectId,
    projectName,
    timeEntries,
    onSave,
}: TicketTimeTrackingProps) {
    const currentUser = useAuthStore((state) => state.user);
    const { users } = useUsers();

    // ── Mode ────────────────────────────────────────────────
    const [mode, setMode] = useState<Mode>('idle');

    // ── Log form ────────────────────────────────────────────
    const todayISO = new Date().toISOString().split('T')[0];
    const [logDate, setLogDate] = useState(todayISO);
    const [logHours, setLogHours] = useState('');
    const [logDesc, setLogDesc] = useState('');
    const [logUserId, setLogUserId] = useState(currentUser?.uid ?? '');

    // ── Timer ───────────────────────────────────────────────
    const [timerSeconds, setTimerSeconds] = useState(0);
    const [timerRunning, setTimerRunning] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // ── Sheet sync ───────────────────────────────────────────
    const [syncState, setSyncState] = useState<SyncState>('idle');
    const [syncMsg, setSyncMsg] = useState('');
    const [sheetUrl, setSheetUrl] = useState('');

    // ── History ─────────────────────────────────────────────
    const [showHistory, setShowHistory] = useState(false);

    useEffect(() => {
        if (currentUser?.uid && !logUserId) setLogUserId(currentUser.uid);
    }, [currentUser]);

    // Timer tick
    useEffect(() => {
        if (timerRunning) {
            timerRef.current = setInterval(() => setTimerSeconds((s) => s + 1), 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [timerRunning]);

    const handleStartTimer = () => {
        setTimerSeconds(0);
        setTimerRunning(true);
        setMode('timer');
        setSyncState('idle');
    };

    const handleStopTimer = () => {
        setTimerRunning(false);
        const hours = Math.round((timerSeconds / 3600) * 100) / 100;
        setLogHours(hours > 0 ? String(hours) : '0.01');
        setLogDate(new Date().toISOString().split('T')[0]);
        setLogDesc('');
        setMode('log');
    };

    const handleLogWork = () => {
        setLogDate(todayISO);
        setLogHours('');
        setLogDesc('');
        setSyncState('idle');
        setSyncMsg('');
        setMode('log');
    };

    const handleCancel = () => {
        if (timerRunning) { setTimerRunning(false); setTimerSeconds(0); }
        setMode('idle');
        setSyncState('idle');
        setSyncMsg('');
    };

    /** Push one entry to /api/time-entry/ticket (additive sheet write) */
    const syncToSheet = useCallback(async (entry: TimeEntry) => {
        if (!currentUser?.uid || !projectName) return;

        setSyncState('syncing');
        setSyncMsg('Syncing to Google Sheets…');

        try {
            const token = await getIdToken();
            const res = await fetch('/api/time-entry/ticket', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    userUid: entry.userId,          // sync for the person who logged time
                    date: entry.date,               // ISO YYYY-MM-DD
                    hours: entry.hours,
                    project: projectName,           // match against sheet columns
                }),
            });

            const data = await res.json();

            if (res.status === 206) {
                // Saved locally, no sheet matched
                setSyncState('no-sheet');
                setSyncMsg(data.message || 'Saved to ticket. No sheet linked.');
                return;
            }

            if (!res.ok) {
                setSyncState('error');
                setSyncMsg(data.error || 'Sheet sync failed.');
                return;
            }

            setSyncState('success');
            setSyncMsg(`✓ Added to Google Sheet (${data.date})`);
            if (data.spreadsheetUrl) setSheetUrl(data.spreadsheetUrl);

        } catch (err: any) {
            setSyncState('error');
            setSyncMsg(err.message || 'Network error during sheet sync.');
        }
    }, [currentUser, projectName]);

    const handleSaveLog = useCallback(async () => {
        const hours = parseHoursInput(logHours);
        if (isNaN(hours) || hours <= 0) return;

        const newEntry: TimeEntry = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            userId: logUserId || currentUser?.uid || 'unknown',
            date: logDate,
            hours,
            description: logDesc.trim(),
            createdAt: new Date().toISOString(),
        };

        // 1. Save to Firestore immediately (optimistic)
        onSave([...timeEntries, newEntry]);
        setMode('idle');
        setLogHours('');
        setLogDesc('');

        // 2. Async sheet sync
        await syncToSheet(newEntry);
    }, [logDate, logHours, logDesc, logUserId, currentUser, timeEntries, onSave, syncToSheet]);

    const handleDeleteEntry = (id: string) => {
        onSave(timeEntries.filter((e) => e.id !== id));
        // Note: we don't subtract from the sheet (avoids over-engineering for now)
    };

    const totalHours = timeEntries.reduce((sum, e) => sum + (e.hours || 0), 0);

    const getUserName = (uid: string) => {
        const u = users.find((u) => u.uid === uid);
        return u?.displayName || u?.email || 'Unknown';
    };

    // Auto-dismiss success/no-sheet after 5s
    useEffect(() => {
        if (syncState === 'success' || syncState === 'no-sheet') {
            const t = setTimeout(() => { setSyncState('idle'); setSyncMsg(''); }, 5000);
            return () => clearTimeout(t);
        }
    }, [syncState]);

    return (
        <section className="flex flex-col gap-4">
            {/* Section Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-primary dark:text-white flex items-center gap-2">
                    <span className="material-symbols-outlined">timer</span>
                    Time Tracking
                    {totalHours > 0 && (
                        <span className="ml-2 text-sm font-normal bg-primary/10 text-primary dark:bg-blue-900/40 dark:text-blue-300 px-2.5 py-0.5 rounded-full">
                            {hoursToDisplay(totalHours)} logged
                        </span>
                    )}
                </h3>
            </div>

            {/* Card */}
            <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">

                {/* ── Idle buttons ───────────────────────────── */}
                {mode === 'idle' && (
                    <div className="flex items-center gap-3 px-6 py-5">
                        <Button
                            variant="outline"
                            size="sm"
                            className="rounded-lg border-slate-200 dark:border-slate-600 hover:bg-primary hover:text-white hover:border-primary font-semibold transition-all gap-2"
                            onClick={handleLogWork}
                        >
                            <Plus className="h-4 w-4" />
                            Log work
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="rounded-lg border-slate-200 dark:border-slate-600 hover:bg-green-600 hover:text-white hover:border-green-600 font-semibold transition-all gap-2"
                            onClick={handleStartTimer}
                        >
                            <Play className="h-4 w-4" />
                            Start timer
                        </Button>
                    </div>
                )}

                {/* ── Running Timer ──────────────────────────── */}
                {mode === 'timer' && (
                    <div className="flex items-center gap-6 px-6 py-5">
                        <div className="flex items-center gap-3 text-primary dark:text-blue-400">
                            <Clock className="h-5 w-5 animate-pulse" />
                            <span className="font-mono text-2xl font-bold tracking-wider tabular-nums">
                                {formatDuration(timerSeconds)}
                            </span>
                        </div>
                        <Button
                            size="sm"
                            className="bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold gap-2 shadow-sm"
                            onClick={handleStopTimer}
                        >
                            <Square className="h-4 w-4 fill-white" />
                            Stop timer
                        </Button>
                        <button
                            className="ml-auto text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                            onClick={handleCancel}
                            title="Discard timer"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                )}

                {/* ── Log Form ───────────────────────────────── */}
                {mode === 'log' && (
                    <div className="px-6 py-5 flex flex-col gap-4">
                        <div className="flex flex-wrap items-end gap-3">
                            {/* Date */}
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Date</label>
                                <input
                                    type="date"
                                    value={logDate}
                                    onChange={(e) => setLogDate(e.target.value)}
                                    className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 w-36"
                                />
                            </div>

                            {/* Hours */}
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Hours</label>
                                <input
                                    type="text"
                                    placeholder="2h, 1.5, 30m…"
                                    value={logHours}
                                    onChange={(e) => setLogHours(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveLog()}
                                    className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 w-28"
                                    autoFocus
                                />
                            </div>

                            {/* Person */}
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Person</label>
                                <div className="relative">
                                    <select
                                        value={logUserId}
                                        onChange={(e) => setLogUserId(e.target.value)}
                                        className="h-9 pl-3 pr-7 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none w-40"
                                    >
                                        {users.map((u) => (
                                            <option key={u.uid} value={u.uid}>
                                                {u.displayName || u.email}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                                </div>
                            </div>

                            {/* Description */}
                            <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Description</label>
                                <input
                                    type="text"
                                    placeholder="What did you work on?"
                                    value={logDesc}
                                    onChange={(e) => setLogDesc(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveLog()}
                                    className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 w-full"
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex items-end gap-2">
                                <Button
                                    size="sm"
                                    className="bg-primary text-white hover:bg-primary/90 rounded-lg font-bold shadow-sm shadow-primary/20 gap-2 h-9"
                                    onClick={handleSaveLog}
                                    disabled={!logHours || isNaN(parseHoursInput(logHours)) || parseHoursInput(logHours) <= 0}
                                >
                                    <Check className="h-4 w-4" />
                                    Log it
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="rounded-lg border-slate-200 dark:border-slate-600 font-semibold h-9"
                                    onClick={handleCancel}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Sheet Sync Status ──────────────────────── */}
                {syncState !== 'idle' && (
                    <div className={cn(
                        'flex items-center gap-2 px-6 py-2 text-xs font-semibold border-t',
                        syncState === 'syncing' && 'text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-700',
                        syncState === 'success' && 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-900/30',
                        syncState === 'no-sheet' && 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/30',
                        syncState === 'error' && 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30',
                    )}>
                        {syncState === 'syncing' && <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />}
                        {syncState === 'success' && <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />}
                        {(syncState === 'no-sheet' || syncState === 'error') && <AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
                        <span className="flex-1">{syncMsg}</span>
                        {syncState === 'success' && sheetUrl && (
                            <a
                                href={sheetUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 underline hover:no-underline"
                            >
                                Open sheet <ExternalLink className="h-3 w-3" />
                            </a>
                        )}
                    </div>
                )}

                {/* ── Logged Entries ─────────────────────────── */}
                {timeEntries.length > 0 && (
                    <div className="border-t border-slate-100 dark:border-slate-700">
                        <button
                            className="w-full flex items-center justify-between px-6 py-3 text-xs font-bold uppercase tracking-widest text-on-surface-variant hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                            onClick={() => setShowHistory((v) => !v)}
                        >
                            <span>
                                {timeEntries.length} entr{timeEntries.length === 1 ? 'y' : 'ies'} · {hoursToDisplay(totalHours)} total
                            </span>
                            <ChevronDown className={cn('h-4 w-4 transition-transform', showHistory && 'rotate-180')} />
                        </button>

                        {showHistory && (
                            <ul className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                {[...timeEntries]
                                    .sort((a, b) => b.date.localeCompare(a.date))
                                    .map((entry) => (
                                        <li
                                            key={entry.id}
                                            className="group flex items-center gap-4 px-6 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                                        >
                                            <span className="text-xs text-on-surface-variant w-16 shrink-0">
                                                {format(new Date(entry.date + 'T12:00:00'), 'MMM d')}
                                            </span>
                                            <span className="bg-primary/10 text-primary dark:bg-blue-900/40 dark:text-blue-300 text-xs font-bold px-2.5 py-0.5 rounded-full shrink-0">
                                                {hoursToDisplay(entry.hours)}
                                            </span>
                                            <span className="text-sm text-slate-700 dark:text-slate-300 font-medium shrink-0">
                                                {getUserName(entry.userId)}
                                            </span>
                                            {entry.description && (
                                                <span className="text-sm text-on-surface-variant flex-1 truncate">
                                                    {entry.description}
                                                </span>
                                            )}
                                            <button
                                                className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500"
                                                onClick={() => handleDeleteEntry(entry.id)}
                                                title="Remove entry"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </li>
                                    ))}
                            </ul>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
}
