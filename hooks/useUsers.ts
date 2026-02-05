'use client';

import { useState, useEffect } from 'react';
import { UserProfile } from '@/types';
import { subscribeToUsers } from '@/lib/services/user';

export const useUsers = () => {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = subscribeToUsers((data) => {
            setUsers(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return {
        users,
        loading,
        error
    };
};
