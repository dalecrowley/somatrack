'use client';

import { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { onAuthChange } from '@/lib/firebase/auth';
import { db } from '@/lib/firebase/config';

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
    const [user, setUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Subscribe to auth state changes
        console.log('Setting up useAuth subscription...');
        const unsubscribeAuth = onAuthChange((authUser) => {
            console.log('Auth state changed:', authUser ? 'User logged in' : 'User logged out', authUser?.email);
            setUser(authUser);

            if (!authUser) {
                setUserData(null);
                setLoading(false);
                return;
            }

            // Subscribe to user document in Firestore
            console.log('Fetching Firestore user data...');
            const userRef = doc(db, 'users', authUser.uid);
            const unsubscribeFirestore = onSnapshot(userRef, (docSnap) => {
                console.log('Firestore snapshot received:', docSnap.exists());
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setUserData({
                        uid: authUser.uid,
                        email: authUser.email,
                        displayName: authUser.displayName,
                        photoURL: authUser.photoURL,
                        role: data.role || 'member',
                    });
                }
                setLoading(false);
            }, (error) => {
                console.error('Firestore snapshot error:', error);
                setLoading(false);
            });

            return () => unsubscribeFirestore();
        });

        return () => unsubscribeAuth();
    }, []);

    return { user, userData, loading };
};
