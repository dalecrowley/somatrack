import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    getDocs,
    query,
    orderBy,
    serverTimestamp,
    getDoc,
    onSnapshot
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Client } from '@/types';

const COLLECTION = 'clients';

/**
 * Create a new client
 */
export const createClient = async (name: string, userId: string): Promise<string> => {
    try {
        const docRef = await addDoc(collection(db, COLLECTION), {
            name,
            createdBy: userId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        return docRef.id;
    } catch (error) {
        console.error('Error creating client:', error);
        throw error;
    }
};

/**
 * Get all clients ordered by name
 */
export const getClients = async (): Promise<Client[]> => {
    try {
        const q = query(collection(db, COLLECTION), orderBy('name'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Client));
    } catch (error) {
        console.error('Error fetching clients:', error);
        throw error;
    }
};

/**
 * Subscribe to clients list for real-time updates
 */
export const subscribeToClients = (callback: (clients: Client[]) => void) => {
    const q = query(collection(db, COLLECTION), orderBy('name'));
    return onSnapshot(q, (snapshot) => {
        const clients = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Client));
        callback(clients);
    }, (error) => {
        console.error('Error in clients subscription:', error);
    });
};

/**
 * Get a single client by ID
 */
export const getClient = async (id: string): Promise<Client | null> => {
    try {
        const docRef = doc(db, COLLECTION, id);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
            return { id: snapshot.id, ...snapshot.data() } as Client;
        }
        return null;
    } catch (error) {
        console.error('Error fetching client:', error);
        throw error;
    }
};

/**
 * Update a client
 */
export const updateClient = async (id: string, data: Partial<Client>): Promise<void> => {
    try {
        const docRef = doc(db, COLLECTION, id);
        await updateDoc(docRef, {
            ...data,
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('Error updating client:', error);
        throw error;
    }
};

/**
 * Delete a client
 */
export const deleteClient = async (id: string): Promise<void> => {
    try {
        const docRef = doc(db, COLLECTION, id);
        await deleteDoc(docRef);
    } catch (error) {
        console.error('Error deleting client:', error);
        throw error;
    }
};
