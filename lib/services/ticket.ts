import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    getDocs,
    query,
    where,
    orderBy,
    serverTimestamp,
    getDoc,
    onSnapshot
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Ticket } from '@/types';

/**
 * Subscribe to tickets for a specific project
 */
export const subscribeToTickets = (
    projectId: string,
    callback: (tickets: Ticket[]) => void
) => {
    // Tickets are stored in a subcollection 'tickets' under the project document
    const ticketsRef = collection(db, 'projects', projectId, 'tickets');
    const q = query(
        ticketsRef,
        orderBy('order', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
        const tickets = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Ticket));
        callback(tickets);
    }, (error) => {
        console.error('Error in tickets subscription:', error);
    });
};

/**
 * Create a new ticket
 */
export const createTicket = async (
    projectId: string,
    data: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>,
    userId: string
): Promise<string> => {
    try {
        const ticketsRef = collection(db, 'projects', projectId, 'tickets');
        const docRef = await addDoc(ticketsRef, {
            ...data,
            createdBy: userId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        return docRef.id;
    } catch (error) {
        console.error('Error creating ticket:', error);
        throw error;
    }
};

/**
 * Update a ticket
 */
export const updateTicket = async (
    projectId: string,
    ticketId: string,
    data: Partial<Ticket>
): Promise<void> => {
    try {
        const ticketRef = doc(db, 'projects', projectId, 'tickets', ticketId);
        await updateDoc(ticketRef, {
            ...data,
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('Error updating ticket:', error);
        throw error;
    }
};

/**
 * Delete a ticket
 */
export const deleteTicket = async (projectId: string, ticketId: string): Promise<void> => {
    try {
        const ticketRef = doc(db, 'projects', projectId, 'tickets', ticketId);
        await deleteDoc(ticketRef);
    } catch (error) {
        console.error('Error deleting ticket:', error);
        throw error;
    }
};
