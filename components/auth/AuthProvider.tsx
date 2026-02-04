'use client';

import { useEffect } from 'react';
import { onAuthChange } from '@/lib/firebase/auth';
import { useAuthStore } from '@/lib/store/useAuthStore';

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const setUser = useAuthStore((state) => state.setUser);
    const setLoading = useAuthStore((state) => state.setLoading);

    useEffect(() => {
        const unsubscribe = onAuthChange((user) => {
            setUser(user);
        });

        return () => unsubscribe();
    }, [setUser, setLoading]);

    return <>{children}</>;
}
