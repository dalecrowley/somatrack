'use client';

import { useEffect } from 'react';
import { onAuthChange } from '@/lib/firebase/auth';
import { useAuthStore } from '@/lib/store/useAuthStore';

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const setUser = useAuthStore((state) => state.setUser);
    const setLoading = useAuthStore((state) => state.setLoading);

    useEffect(() => {
        console.log('[Auth] Provider mounted, initializing listener...');

        const unsubscribe = onAuthChange((user) => {
            console.log('[Auth] State changed in Provider:', user ? `User logged in as ${user.email}` : 'No user detected');

            // Expose for easier debugging in console
            if (typeof window !== 'undefined') {
                (window as any).__FIREBASE_USER = user;
            }

            setUser(user);
        });

        return () => {
            console.log('[Auth] Provider unmounting, cleaning up listener...');
            unsubscribe();
        };
    }, [setUser, setLoading]);

    return <>{children}</>;
}
