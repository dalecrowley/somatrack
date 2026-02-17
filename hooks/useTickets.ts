'use client';

import { useState, useEffect } from 'react';
import { Ticket } from '@/types';
import {
    subscribeToTickets,
    createTicket,
    updateTicket,
    deleteTicket,
    subscribeToArchivedTickets
} from '@/lib/services/ticket';

export const useTickets = (projectId?: string) => {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!projectId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        // Subscribe to real-time updates for tickets
        const unsubscribe = subscribeToTickets(projectId, (data) => {
            setTickets(data);
            setLoading(false);
        });

        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, [projectId]);

    const addTicket = async (data: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>, userId: string, ticketId?: string) => {
        if (!projectId) return false;
        try {
            await createTicket(projectId, data, userId, ticketId);
            return true;
        } catch (err: any) {
            setError(err.message || 'Failed to create ticket');
            return false;
        }
    };

    const editTicket = async (ticketId: string, data: Partial<Ticket>) => {
        if (!projectId) return false;
        try {
            await updateTicket(projectId, ticketId, data);
            return true;
        } catch (err: any) {
            setError(err.message || 'Failed to update ticket');
            return false;
        }
    };

    const removeTicket = async (ticketId: string) => {
        if (!projectId) return false;
        try {
            await deleteTicket(projectId, ticketId);
            return true;
        } catch (err: any) {
            setError(err.message || 'Failed to delete ticket');
            return false;
        }
    };

    const archiveTicket = async (ticketId: string) => {
        if (!projectId) return false;
        try {
            await updateTicket(projectId, ticketId, { isArchived: true });
            return true;
        } catch (err: any) {
            setError(err.message || 'Failed to archive ticket');
            return false;
        }
    };

    const unarchiveTicket = async (ticketId: string) => {
        if (!projectId) return false;
        try {
            await updateTicket(projectId, ticketId, { isArchived: false });
            return true;
        } catch (err: any) {
            setError(err.message || 'Failed to unarchive ticket');
            return false;
        }
    };

    return {
        tickets,
        loading,
        error,
        addTicket,
        editTicket,
        removeTicket,
        archiveTicket,
        unarchiveTicket
    };
};

export const useArchivedTickets = (projectId?: string) => {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!projectId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        const unsubscribe = subscribeToArchivedTickets(projectId, (data) => {
            setTickets(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [projectId]);

    return { tickets, loading, error };
};
