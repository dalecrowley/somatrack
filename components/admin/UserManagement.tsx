"use client";

import { useState, FormEvent } from 'react';
import { useUsers } from '@/hooks/useUsers';
import { useIsAdmin } from '@/hooks/useAuth';
import { AdminOnly } from '@/components/admin/AdminOnly';
import { UserProfile } from '@/types';
import styles from './UserManagement.module.css';

/**
 * Admin UI for listing, inviting, and removing users.
 */
export const UserManagement = () => {
    const { users, loading } = useUsers();
    const isAdmin = useIsAdmin();
    const [email, setEmail] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [role, setRole] = useState<'admin' | 'member'>('member');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    if (!isAdmin) return null;

    const handleInvite = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        try {
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, displayName, role }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to invite');
            setSuccess(`Invitation sent (uid: ${data.uid})`);
            setEmail('');
            setDisplayName('');
            setRole('member');
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleDelete = async (uid: string) => {
        if (!confirm('Are you sure you want to delete this user?')) return;
        try {
            const res = await fetch(`/api/users?uid=${uid}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to delete');
            setSuccess('User deleted');
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <AdminOnly>
            <section className={styles.container}>
                <h2 className={styles.title}>👑 Admin User Management</h2>
                <form className={styles.form} onSubmit={handleInvite}>
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        required
                        onChange={(e) => setEmail(e.target.value)}
                        className={styles.input}
                    />
                    <input
                        type="text"
                        placeholder="Display Name (optional)"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className={styles.input}
                    />
                    <select value={role} onChange={(e) => setRole(e.target.value as any)} className={styles.select}>
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                    </select>
                    <button type="submit" className={styles.button}>Invite</button>
                </form>
                {error && <p className={styles.error}>❌ {error}</p>}
                {success && <p className={styles.success}>✅ {success}</p>}
                <h3 className={styles.subTitle}>Current Users</h3>
                {loading ? (
                    <p>Loading users…</p>
                ) : (
                    <ul className={styles.list}>
                        {users.map((u: UserProfile) => (
                            <li key={u.uid} className={styles.listItem}>
                                <div className={styles.userInfo}>
                                    <span className={styles.userName}>{u.displayName || 'Unnamed'}</span>
                                    <span className={styles.userEmail}>{u.email || 'test user'}</span>
                                </div>
                                <span className={styles.role}>({u.role})</span>
                                <button className={styles.deleteBtn} onClick={() => handleDelete(u.uid)}>
                                    Delete
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </AdminOnly>
    );
};
