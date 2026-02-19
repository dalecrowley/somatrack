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
import { Project } from '@/types';

const COLLECTION = 'projects';

/**
 * Create a new project
 */
export const createProject = async (
    name: string,
    clientId: string,
    userId: string,
    logoUrl?: string,
    logoUseDarkBackground?: boolean
): Promise<string> => {
    try {
        const docRef = await addDoc(collection(db, COLLECTION), {
            name,
            clientId,
            logoUrl: logoUrl || null,
            logoUseDarkBackground: !!logoUseDarkBackground,
            createdBy: userId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        return docRef.id;
    } catch (error) {
        console.error('Error creating project:', error);
        throw error;
    }
};

/**
 * Subscribe to projects for a specific client (active only)
 */
export const subscribeToProjects = (
    clientId: string,
    callback: (projects: Project[]) => void
) => {
    const q = query(
        collection(db, COLLECTION),
        where('clientId', '==', clientId),
        orderBy('name')
    );

    return onSnapshot(q, (snapshot) => {
        const projects = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Project)).filter(p => !p.isArchived);
        callback(projects);
    }, (error) => {
        console.error('Error in projects subscription:', error);
    });
};

/**
 * Subscribe to archived projects for a specific client
 */
export const subscribeToArchivedProjects = (
    clientId: string,
    callback: (projects: Project[]) => void
) => {
    const q = query(
        collection(db, COLLECTION),
        where('clientId', '==', clientId),
        orderBy('name')
    );

    return onSnapshot(q, (snapshot) => {
        const projects = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Project)).filter(p => p.isArchived);
        callback(projects);
    }, (error) => {
        console.error('Error in archived projects subscription:', error);
    });
};

/**
 * Subscribe to a single project
 */
export const subscribeToProject = (
    projectId: string,
    callback: (project: Project | null) => void
) => {
    const docRef = doc(db, COLLECTION, projectId);

    return onSnapshot(docRef, (snapshot) => {
        if (snapshot.exists()) {
            callback({ id: snapshot.id, ...snapshot.data() } as Project);
        } else {
            callback(null);
        }
    }, (error) => {
        console.error('Error in project subscription:', error);
    });
};

/**
 * Get a single project by ID
 */
export const getProject = async (id: string): Promise<Project | null> => {
    try {
        const docRef = doc(db, COLLECTION, id);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
            return { id: snapshot.id, ...snapshot.data() } as Project;
        }
        return null;
    } catch (error) {
        console.error('Error fetching project:', error);
        throw error;
    }
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
 * Update a project
 */
export const updateProject = async (id: string, data: Partial<Project>): Promise<void> => {
    try {
        const docRef = doc(db, COLLECTION, id);
        await updateDoc(docRef, {
            ...sanitizeData(data),
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('Error updating project:', error);
        throw error;
    }
};

/**
 * Delete a project
 */
export const deleteProject = async (id: string): Promise<void> => {
    try {
        const docRef = doc(db, COLLECTION, id);
        await deleteDoc(docRef);
    } catch (error) {
        console.error('Error deleting project:', error);
        throw error;
    }
};
