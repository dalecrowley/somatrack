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

        try {
            const token = await getIdToken();
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ email, displayName, role }),
            });

            const data = await res.json();

            if (!res.ok) {
                console.error('❌ Invite failed server-side:', data);
                throw new Error(data.error || 'Failed to invite user');
            }

            console.log('✅ Invite successful:', data);
            setSuccess(`Invitation created for ${email}`);
            setEmail('');
            setDisplayName('');
            setRole('member');
        } catch (err: any) {
            console.error('❌ Invite caught error:', err);
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRoleUpdate = async (uid: string, newRole: 'admin' | 'member') => {
        setError(null);
        setSuccess(null);
        try {
            const token = await getIdToken();
            const res = await fetch('/api/users', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ uid, role: newRole }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to update role');

            setSuccess('User role updated successfully');
        } catch (err: any) {
            console.error('❌ Role update failed:', err);
            setError(err.message || 'Failed to update role');
        }
    };

    const handleDelete = async (uid: string, userEmail: string) => {
        if (!confirm(`Are you sure you want to delete ${userEmail || 'this user'}?`)) return;

        setError(null);
        setSuccess(null);
        console.log('🗑️ Attempting to delete user:', uid);

        try {
            const res = await fetch(`/api/users?uid=${uid}`, {
                method: 'DELETE'
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
                                        <div key={u.uid} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                    <UserIcon className="h-5 w-5 text-primary" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{u.displayName || 'Unnamed User'}</span>
                                                    <span className="text-xs text-muted-foreground">{u.email || 'No email'}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Select 
                                                    value={u.role} 
                                                    onValueChange={(v: 'admin' | 'member') => handleRoleUpdate(u.uid, v)}
                                                    disabled={u.uid === currentUser?.uid}
                                                >
                                                    <SelectTrigger className="w-32 h-8 text-xs">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="member">Member</SelectItem>
                                                        <SelectItem value="admin">Admin</SelectItem>
                                                    </SelectContent>
                                                </Select>

                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => handleDelete(u.uid, u.email || 'this user')}
                                                    disabled={u.uid === currentUser?.uid}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
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
