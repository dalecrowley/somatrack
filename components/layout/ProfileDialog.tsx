'use client';

import { useState, useRef } from 'react';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';
import { getIdToken } from '@/lib/firebase/auth';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Upload, X, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProfileDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

export function ProfileDialog({ open, onOpenChange }: ProfileDialogProps) {
    const user = useAuthStore((state) => state.user);
    const setUser = useAuthStore((state) => state.setUser);
    const [uploadState, setUploadState] = useState<UploadState>('idle');
    const [uploadMsg, setUploadMsg] = useState('');
    const [removing, setRemoving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const getUserInitials = () => {
        if (!user?.displayName) return 'ST';
        return user.displayName
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        // Basic client-side size check (max 10 MB)
        if (file.size > 10 * 1024 * 1024) {
            setUploadState('error');
            setUploadMsg('Image must be under 10 MB.');
            return;
        }

        try {
            setUploadState('uploading');
            setUploadMsg('Uploading to Box…');

            // ── Build multipart form ──────────────────────────────────────────
            const formData = new FormData();
            formData.append('file', file);
            formData.append('userUid', user.uid);

            const token = await getIdToken();
            const res = await fetch('/api/box/avatar', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.details || data.error || 'Upload failed');
            }

            const photoURL: string = data.sharedLink;

            // ── Update Firebase Auth profile ─────────────────────────────────
            if (auth.currentUser) {
                await updateProfile(auth.currentUser, { photoURL });
            }

            // ── Update Firestore user document ───────────────────────────────
            await updateDoc(doc(db, 'users', user.uid), { photoURL });

            // ── Update Zustand store so header/avatar updates instantly ───────
            setUser({ ...user, photoURL } as any);

            setUploadState('success');
            setUploadMsg('Avatar updated!');

        } catch (err: any) {
            console.error('Avatar upload error:', err);
            setUploadState('error');
            setUploadMsg(err.message || 'Upload failed. Please try again.');
        } finally {
            // Clear file input so the same file can be re-selected if needed
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleRemoveAvatar = async () => {
        if (!user) return;
        try {
            setRemoving(true);
            setUploadState('idle');
            setUploadMsg('');

            if (auth.currentUser) {
                await updateProfile(auth.currentUser, { photoURL: null });
            }
            await updateDoc(doc(db, 'users', user.uid), { photoURL: null });
            setUser({ ...user, photoURL: null } as any);

        } catch (err: any) {
            console.error('Remove avatar error:', err);
            setUploadState('error');
            setUploadMsg('Could not remove avatar. Please try again.');
        } finally {
            setRemoving(false);
        }
    };

    const busy = uploadState === 'uploading' || removing;

    if (!user) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] bg-surface dark:bg-slate-900 border-outline-variant/20 rounded-2xl shadow-xl font-['Inter']">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-primary dark:text-white">
                        Profile Settings
                    </DialogTitle>
                    <DialogDescription className="text-on-surface-variant">
                        Upload a new photo or remove your current avatar.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col items-center gap-6 py-6">
                    {/* Avatar + action buttons */}
                    <div className="relative group">
                        <Avatar className="h-32 w-32 border-4 border-white dark:border-slate-800 shadow-md">
                            <AvatarImage
                                src={user.photoURL || ''}
                                alt={user.displayName || ''}
                                className="object-cover"
                            />
                            <AvatarFallback className="text-4xl bg-primary/10 text-primary font-bold">
                                {getUserInitials()}
                            </AvatarFallback>
                        </Avatar>

                        {/* Loading overlay */}
                        {busy && (
                            <div className="absolute inset-0 bg-white/60 dark:bg-black/50 rounded-full flex items-center justify-center backdrop-blur-[2px]">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        )}

                        {/* Upload / Remove buttons */}
                        <div className="absolute -bottom-2 -right-2 flex gap-2">
                            <button
                                onClick={() => {
                                    setUploadState('idle');
                                    setUploadMsg('');
                                    fileInputRef.current?.click();
                                }}
                                disabled={busy}
                                className="h-10 w-10 bg-primary text-white rounded-full flex items-center justify-center shadow-lg hover:bg-primary/90 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Upload new image"
                            >
                                <Upload className="h-4 w-4" />
                            </button>
                            {user.photoURL && (
                                <button
                                    onClick={handleRemoveAvatar}
                                    disabled={busy}
                                    className="h-10 w-10 bg-white dark:bg-slate-800 text-red-500 rounded-full flex items-center justify-center shadow-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-100 dark:border-slate-700"
                                    title="Remove photo"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>

                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                        />
                    </div>

                    {/* Name / email */}
                    <div className="text-center">
                        <h3 className="text-lg font-bold text-primary dark:text-white">
                            {user.displayName}
                        </h3>
                        <p className="text-sm text-on-surface-variant">{user.email}</p>
                    </div>

                    {/* Status feedback */}
                    {uploadMsg && (
                        <div className={cn(
                            'flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl w-full justify-center',
                            uploadState === 'success' && 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400',
                            uploadState === 'error'   && 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
                            uploadState === 'uploading' && 'bg-primary/5 text-primary',
                        )}>
                            {uploadState === 'success'   && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                            {uploadState === 'error'     && <AlertTriangle className="h-4 w-4 shrink-0" />}
                            {uploadState === 'uploading' && <Loader2 className="h-4 w-4 shrink-0 animate-spin" />}
                            <span>{uploadMsg}</span>
                        </div>
                    )}

                    {/* Helper text */}
                    <p className="text-xs text-on-surface-variant text-center -mt-2">
                        Accepts JPG, PNG, GIF, WebP · Max 10 MB
                    </p>
                </div>

                <DialogFooter className="border-t border-outline-variant/10 pt-4">
                    <Button
                        onClick={() => onOpenChange(false)}
                        className="w-full font-bold rounded-xl"
                        variant="ghost"
                        disabled={busy}
                    >
                        Done
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
