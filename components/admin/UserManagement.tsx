"use client";

import { useState, FormEvent } from 'react';
import { useUsers } from '@/hooks/useUsers';
import { signInWithGoogle, getIdToken } from '@/lib/firebase/auth';
import { useIsAdmin, useAuth } from '@/hooks/useAuth';
import { AdminOnly } from '@/components/admin/AdminOnly';
import { UserProfile } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, UserPlus, Shield, User as UserIcon, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

/**
 * Admin UI for listing, inviting, and removing users.
 */
export const UserManagement = () => {
    const { users, loading } = useUsers();
    const isAdmin = useIsAdmin();
    const { userData: currentUser } = useAuth();
    const [email, setEmail] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [role, setRole] = useState<'admin' | 'member'>('member');
    const [spreadsheetId, setSpreadsheetId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    if (!isAdmin) return null;

    const handleInvite = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setIsSubmitting(true);

        console.log('🚀 Attempting to invite user:', { email, role });
        setError(null);

        try {
            const token = await getIdToken();
            if (!token) {
                console.warn('⚠️ No auth token found during invite');
                throw new Error('Unauthorized: No active session found. Please try logging out and back in.');
            }

            console.log('🛰️ Sending invite request for:', email);
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ email, displayName, role, spreadsheetId }),
            });

            const data = await res.json();

            if (!res.ok) {
                console.error('❌ Invite failed server-side:', data);
                throw new Error(data.error || 'Failed to invite user');
            }

            console.log('✅ Invite successful:', data);
            setSuccess(data.updated ? `Role updated for existing user ${email}` : `Invitation created for ${email}`);
            setEmail('');
            setDisplayName('');
            setSpreadsheetId('');
            setRole('member');
        } catch (err: any) {
            console.error('❌ Invite caught error:', err);
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUserUpdate = async (uid: string, updates: Partial<UserProfile>) => {
        setError(null);
        setSuccess(null);
        try {
            const token = await getIdToken();
            if (!token) {
                throw new Error('Unauthorized: No active session found. Please try logging out and back in.');
            }
            
            const res = await fetch('/api/users', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ uid, ...updates }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to update user');

            setSuccess('User updated successfully');
        } catch (err: any) {
            console.error('❌ User update failed:', err);
            setError(err.message || 'Failed to update user');
        }
    };

    const handleDelete = async (uid: string, userEmail: string) => {
        if (!confirm(`Are you sure you want to delete ${userEmail || 'this user'}?`)) return;

        setError(null);
        setSuccess(null);
        console.log('🗑️ Attempting to delete user:', uid);

        try {
            const token = await getIdToken();
            if (!token) {
                throw new Error('Unauthorized: No active session found. Please try logging out and back in.');
            }

            const res = await fetch(`/api/users?uid=${uid}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await res.json();

            if (!res.ok) {
                console.error('❌ Delete failed server-side:', data);
                throw new Error(data.error || 'Failed to delete user');
            }

            console.log('✅ Delete successful:', data);
            setSuccess('User removed successfully');
        } catch (err: any) {
            console.error('❌ Delete caught error:', err);
            setError(err.message);
        }
    };

    return (
        <AdminOnly>
            <div className="space-y-6 max-w-4xl mx-auto">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-primary" />
                            User Management
                        </CardTitle>
                        <CardDescription>
                            Invite new users to SomaTrack or manage existing team members.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleInvite} className="flex flex-col md:flex-row gap-3 items-end">
                            <div className="grid gap-2 flex-1 w-full">
                                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Email Address</label>
                                <Input
                                    type="email"
                                    placeholder="user@somatone.com"
                                    value={email}
                                    required
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                            <div className="grid gap-2 flex-1 w-full">
                                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Display Name</label>
                                <Input
                                    type="text"
                                    placeholder="John Doe"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                />
                            </div>
                            <div className="grid gap-2 w-full md:w-32">
                                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Role</label>
                                <Select value={role} onValueChange={(v: any) => setRole(v)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="member">Member</SelectItem>
                                        <SelectItem value="admin">Admin</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2 flex-1 w-full">
                                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Spreadsheet ID</label>
                                <Input
                                    type="text"
                                    placeholder="1A2B3C..."
                                    value={spreadsheetId}
                                    onChange={(e) => setSpreadsheetId(e.target.value)}
                                />
                            </div>
                            <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
                                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}
                                Invite
                            </Button>
                        </form>

                        {error && (
                            <div className="mt-4 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
                                ❌ {error}
                            </div>
                        )}
                        {success && (
                            <div className="mt-4 p-3 rounded-md bg-primary/10 border border-primary/20 text-primary text-sm flex items-center gap-2">
                                ✅ {success}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Team Members</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <div className="divide-y border rounded-md">
                                {users.length === 0 ? (
                                    <div className="p-8 text-center text-muted-foreground">
                                        No users found.
                                    </div>
                                ) : (
                                    users.map((u: UserProfile) => (
                                        <div key={u.uid} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 hover:bg-muted/30 transition-colors">
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                <div className="h-10 w-10 flex-shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                                                    <UserIcon className="h-5 w-5 text-primary" />
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="font-medium truncate">{u.displayName || 'Unnamed User'}</span>
                                                    <span className="text-xs text-muted-foreground truncate">{u.email || 'No email'}</span>
                                                </div>
                                            </div>

                                            <div className="flex flex-col md:flex-row items-start md:items-center gap-3 flex-shrink-0">
                                                <div className="flex flex-col gap-1 w-full md:w-48">
                                                    <label className="text-[10px] font-bold uppercase text-muted-foreground/60 px-1">Spreadsheet ID</label>
                                                    <Input
                                                        defaultValue={u.spreadsheetId || ''}
                                                        placeholder="Google Sheet ID"
                                                        className="h-8 text-xs bg-background/50"
                                                        onBlur={(e) => {
                                                            if (e.target.value !== (u.spreadsheetId || '')) {
                                                                handleUserUpdate(u.uid, { spreadsheetId: e.target.value });
                                                            }
                                                        }}
                                                    />
                                                </div>

                                                <div className="flex items-center gap-2 w-full md:w-auto">
                                                    <div className="flex flex-col gap-1 w-full md:w-32">
                                                        <label className="text-[10px] font-bold uppercase text-muted-foreground/60 px-1">Role</label>
                                                        <Select 
                                                            value={u.role} 
                                                            onValueChange={(v: 'admin' | 'member') => handleUserUpdate(u.uid, { role: v })}
                                                            disabled={u.uid === currentUser?.uid}
                                                        >
                                                            <SelectTrigger className="w-full md:w-32 h-8 text-xs">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="member">Member</SelectItem>
                                                                <SelectItem value="admin">Admin</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 mt-5"
                                                        onClick={() => handleDelete(u.uid, u.email || 'this user')}
                                                        disabled={u.uid === currentUser?.uid}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AdminOnly>
    );
};
