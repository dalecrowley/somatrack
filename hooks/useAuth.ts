'use client';

import { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { onAuthChange } from '@/lib/firebase/auth';
import { db } from '@/lib/firebase/config';
import { useAuthStore } from '@/lib/store/useAuthStore';

export interface UserData {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    role: 'admin' | 'member';
}

/**
 * Hook to get current authenticated user and their Firestore data
 */
export const useAuth = () => {
    const user = useAuthStore((state) => state.user);
    const loading = useAuthStore((state) => state.loading);
    const [userData, setUserData] = useState<UserData | null>(null);

    useEffect(() => {
        if (!user) {
            setUserData(null);
            return;
        }

        // Subscribe to user document in Firestore
        console.log('Fetching Firestore user data for:', user.email);
        const userRef = doc(db, 'users', user.uid);
        const unsubscribeFirestore = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setUserData({
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    role: data.role || 'member',
                });
            }
        }, (error) => {
            console.error('Firestore snapshot error:', error);
        });

        return () => unsubscribe();
        function unsubscribe() {
            unsubscribeFirestore();
        }
    }, [user]);

    return { user, userData, loading };
};
