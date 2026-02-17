import {
    collection,
    doc,
    addDoc,
    setDoc,
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
    const ticketsRef = collection(db, 'projects', projectId, 'tickets');
    // Using a simple query and filtering client-side to avoid index requirements for (!isArchived)
    const q = query(
        ticketsRef,
        orderBy('order', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
        const tickets = snapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Ticket))
            .filter(t => !t.isArchived); // Hide archived by default
        callback(tickets);
    }, (error) => {
        console.error('Error in tickets subscription:', error);
    });
};

/**
 * Subscribe to archived tickets for a specific project
 */
export const subscribeToArchivedTickets = (
    projectId: string,
    callback: (tickets: Ticket[]) => void
) => {
    const ticketsRef = collection(db, 'projects', projectId, 'tickets');
    // Removing the 'where' filter to avoid requiring a composite index for (isArchived == true && orderBy updatedAt)
    const q = query(
        ticketsRef,
        orderBy('updatedAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
        const tickets = snapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Ticket))
            .filter(t => t.isArchived === true);
        callback(tickets);
    }, (error) => {
        console.error('Error in archived tickets subscription:', error);
    });
};

/**
 * Sanitizes data for Firestore by converting undefined to null
 */
const sanitizeData = (data: any) => {
    const sanitized = { ...data };
    Object.keys(sanitized).forEach(key => {
        if (sanitized[key] === undefined) {
            sanitized[key] = null;
        }
    });
    return sanitized;
};

/**
 * Create a new ticket
 */
export const createTicket = async (
    projectId: string,
    data: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>,
    userId: string,
    ticketId?: string
): Promise<string> => {
    try {
        const ticketsRef = collection(db, 'projects', projectId, 'tickets');
        const ticketData = {
            ...sanitizeData(data),
            createdBy: userId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        if (ticketId) {
            const docRef = doc(ticketsRef, ticketId);
            await setDoc(docRef, ticketData);
            return ticketId;
        } else {
            const docRef = await addDoc(ticketsRef, ticketData);
            return docRef.id;
        }
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
            ...sanitizeData(data),
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
