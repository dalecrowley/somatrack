'use client';

import { useState, useEffect } from 'react';
import { Project } from '@/types';
import {
    subscribeToProjects,
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

    const addProject = async (name: string, userId: string) => {
        if (!clientId) return false;
        try {
            await createProject(name, clientId, userId);
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

    return {
        projects,
        loading,
        error,
        addProject,
        editProject,
        removeProject
    };
};
