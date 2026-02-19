'use client';

import { useState, useEffect } from 'react';
import { Project } from '@/types';
import {
    subscribeToProjects,
    subscribeToArchivedProjects,
    createProject,
    updateProject,
    deleteProject
} from '@/lib/services/project';

export const useProjects = (clientId?: string) => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!clientId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        // Subscribe to real-time updates for this client's projects
        const unsubscribe = subscribeToProjects(clientId, (data) => {
            setProjects(data);
            setLoading(false);
        });

        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, [clientId]);

    const addProject = async (name: string, userId: string, logoUrl?: string, logoUseDarkBackground?: boolean) => {
        if (!clientId) return false;
        try {
            await createProject(name, clientId, userId, logoUrl, logoUseDarkBackground);
            return true;
        } catch (err: any) {
            setError(err.message || 'Failed to create project');
            return false;
        }
    };

    const editProject = async (id: string, data: Partial<Project>) => {
        try {
            await updateProject(id, data);
            return true;
        } catch (err: any) {
            setError(err.message || 'Failed to update project');
            return false;
        }
    };

    const removeProject = async (id: string) => {
        try {
            await deleteProject(id);
            return true;
        } catch (err: any) {
            setError(err.message || 'Failed to delete project');
            return false;
        }
    };

    const archiveProject = async (id: string, clientId: string) => {
        try {
            await updateProject(id, { isArchived: true });
            return true;
        } catch (err: any) {
            setError(err.message || 'Failed to archive project');
            return false;
        }
    };

    const unarchiveProject = async (id: string, clientId: string) => {
        try {
            await updateProject(id, { isArchived: false });
            return true;
        } catch (err: any) {
            setError(err.message || 'Failed to unarchive project');
            return false;
        }
    };

    return {
        projects,
        loading,
        error,
        addProject,
        editProject,
        removeProject,
        archiveProject,
        unarchiveProject
    };
};

export const useArchivedProjects = (clientId: string) => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!clientId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        const unsubscribe = subscribeToArchivedProjects(clientId, (data) => {
            setProjects(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [clientId]);

    return { projects, loading, error };
};
