"use client";

import { AdminOnly } from './AdminOnly';
import { useAuth } from '@/hooks/useAuth';
import styles from './AdminPanel.module.css';

/**
 * Simple admin dashboard placeholder – can be expanded with real admin features.
 */
export const AdminPanel = () => {
    const { userData } = useAuth();

    return (
        <AdminOnly>
            <section className={styles.panel}>
                <h2 className={styles.title}>🛠️ Admin Dashboard</h2>
                <p>
                    Welcome, <strong>{userData?.displayName ?? 'Admin'}</strong>! You are logged in as{' '}
                    <code>{userData?.role}</code>.
                </p>
                <div className={styles.placeholder}>
                    <em>Future admin tools will appear here.</em>
                </div>
            </section>
        </AdminOnly>
    );
};
