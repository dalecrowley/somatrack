'use client';

import { useState, useEffect } from 'react';
import { Client } from '@/types';
import { subscribeToClients, subscribeToArchivedClients, createClient, updateClient, deleteClient } from '@/lib/services/client';

export const useClients = () => {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        // Subscribe to real-time updates
        const unsubscribe = subscribeToClients((data) => {
            setClients(data);
            setLoading(false);
        });

        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, []);

    const addClient = async (name: string, userId: string, logoUrl?: string, logoUseDarkBackground?: boolean) => {
        try {
            await createClient(name, userId, logoUrl, logoUseDarkBackground);
            // No need to manually refresh - subscription handles it
            return true;
        } catch (err: any) {
            setError(err.message || 'Failed to create client');
            return false;
        }
    };

    const editClient = async (id: string, data: Partial<Client>) => {
        try {
            await updateClient(id, data);
            return true;
        } catch (err: any) {
            setError(err.message || 'Failed to update client');
            return false;
        }
    };

    const removeClient = async (id: string) => {
        try {
            await deleteClient(id);
            return true;
        } catch (err: any) {
            setError(err.message || 'Failed to delete client');
            return false;
        }
    };

    const archiveClient = async (id: string) => {
        try {
            await updateClient(id, { isArchived: true });
            return true;
        } catch (err: any) {
            setError(err.message || 'Failed to archive client');
            return false;
        }
    };

    const unarchiveClient = async (id: string) => {
        try {
            await updateClient(id, { isArchived: false });
            return true;
        } catch (err: any) {
            setError(err.message || 'Failed to unarchive client');
            return false;
        }
    };

    return {
        clients,
        loading,
        error,
        addClient,
        editClient,
        removeClient,
        archiveClient,
        unarchiveClient
    };
};

export const useArchivedClients = () => {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        const unsubscribe = subscribeToArchivedClients((data) => {
            setClients(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return { clients, loading, error };
};
