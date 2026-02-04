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
import { ProjectGroup } from '@/types';

const COLLECTION = 'projectGroups';

/**
 * Create a new project group
 */
export const createProjectGroup = async (
    name: string,
    clientId: string,
    userId: string
): Promise<string> => {
    try {
        const docRef = await addDoc(collection(db, COLLECTION), {
            name,
            clientId,
            createdBy: userId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        return docRef.id;
    } catch (error) {
        console.error('Error creating project group:', error);
        throw error;
    }
};

/**
 * Subscribe to project groups for a specific client
 */
export const subscribeToProjectGroups = (
    clientId: string,
    callback: (groups: ProjectGroup[]) => void
) => {
    const q = query(
        collection(db, COLLECTION),
        where('clientId', '==', clientId),
        orderBy('name')
    );

    return onSnapshot(q, (snapshot) => {
        const groups = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as ProjectGroup));
        callback(groups);
    }, (error) => {
        console.error('Error in project groups subscription:', error);
    });
};

/**
 * Get a single project group by ID
 */
export const getProjectGroup = async (id: string): Promise<ProjectGroup | null> => {
    try {
        const docRef = doc(db, COLLECTION, id);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
            return { id: snapshot.id, ...snapshot.data() } as ProjectGroup;
        }
        return null;
    } catch (error) {
        console.error('Error fetching project group:', error);
        throw error;
    }
};

/**
 * Update a project group
 */
export const updateProjectGroup = async (id: string, data: Partial<ProjectGroup>): Promise<void> => {
    try {
        const docRef = doc(db, COLLECTION, id);
        await updateDoc(docRef, {
            ...data,
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('Error updating project group:', error);
        throw error;
    }
};

/**
 * Delete a project group
 */
export const deleteProjectGroup = async (id: string): Promise<void> => {
    try {
        const docRef = doc(db, COLLECTION, id);
        await deleteDoc(docRef);
    } catch (error) {
        console.error('Error deleting project group:', error);
        throw error;
    }
};
