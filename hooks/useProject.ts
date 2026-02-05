'use client';

import { useState, useEffect } from 'react';
import { Project } from '@/types';
import { subscribeToProject, updateProject } from '@/lib/services/project';

export const useProject = (projectId?: string) => {
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!projectId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        // Subscribe to real-time updates for the project
        const unsubscribe = subscribeToProject(projectId, (data) => {
            setProject(data);
            setLoading(false);
        });

        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, [projectId]);

    const updateProjectData = async (data: Partial<Project>) => {
        if (!projectId) return false;
        try {
            await updateProject(projectId, data);
            return true;
        } catch (err: any) {
            setError(err.message || 'Failed to update project');
            return false;
        }
    };

    return {
        project,
        loading,
        error,
        updateProject: updateProjectData
    };
};
