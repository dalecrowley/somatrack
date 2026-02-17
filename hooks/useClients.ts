'use client';

import { useState, useEffect } from 'react';
import { Client } from '@/types';
import { subscribeToClients, createClient, updateClient, deleteClient } from '@/lib/services/client';

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

    return {
        clients,
        loading,
        error,
        addClient,
        editClient,
        removeClient
    };
};
