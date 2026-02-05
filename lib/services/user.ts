import {
    collection,
    getDocs,
    onSnapshot,
    query,
    orderBy
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { UserProfile } from '@/types';

const COLLECTION = 'users';

/**
 * Subscribe to all users (for assignee lists)
 */
export const subscribeToUsers = (
    callback: (users: UserProfile[]) => void
) => {
    const q = query(
        collection(db, COLLECTION),
        orderBy('displayName', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
        const users = snapshot.docs.map(doc => ({
            uid: doc.id,
            ...doc.data()
        } as UserProfile));
        callback(users);
    }, (error) => {
        console.error('Error in users subscription:', error);
    });
};

/**
 * Get all users once
 */
export const getUsers = async (): Promise<UserProfile[]> => {
    try {
        const q = query(
            collection(db, COLLECTION),
            orderBy('displayName', 'asc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            uid: doc.id,
            ...doc.data()
        } as UserProfile));
    } catch (error) {
        console.error('Error fetching users:', error);
        return [];
    }
};
