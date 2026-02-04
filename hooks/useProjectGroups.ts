'use client';

import { useState, useEffect } from 'react';
import { ProjectGroup } from '@/types';
import {
    subscribeToProjectGroups,
    createProjectGroup,
    updateProjectGroup,
    deleteProjectGroup
} from '@/lib/services/projectGroup';

export const useProjectGroups = (clientId?: string) => {
    const [groups, setGroups] = useState<ProjectGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!clientId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        // Subscribe to real-time updates for this client's groups
        const unsubscribe = subscribeToProjectGroups(clientId, (data) => {
            setGroups(data);
            setLoading(false);
        });

        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, [clientId]);

    const addGroup = async (name: string, userId: string) => {
        if (!clientId) return false;
        try {
            await createProjectGroup(name, clientId, userId);
            return true;
        } catch (err: any) {
            setError(err.message || 'Failed to create project group');
            return false;
        }
    };

    const editGroup = async (id: string, data: Partial<ProjectGroup>) => {
        try {
            await updateProjectGroup(id, data);
            return true;
        } catch (err: any) {
            setError(err.message || 'Failed to update project group');
            return false;
        }
    };

    const removeGroup = async (id: string) => {
        try {
            await deleteProjectGroup(id);
            return true;
        } catch (err: any) {
            setError(err.message || 'Failed to delete project group');
            return false;
        }
    };

    return {
        groups,
        loading,
        error,
        addGroup,
        editGroup,
        removeGroup
    };
};
