'use client';

import { Suspense } from 'react';
import { useClients } from '@/hooks/useClients';
import { ClientList } from '@/components/clients/ClientList';
import { CreateClientDialog } from '@/components/clients/CreateClientDialog';

export default function ClientsPage() {
    const { clients, loading } = useClients();

    return (
        <div className="container py-8 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage your clients and their projects
                    </p>
                </div>
                <CreateClientDialog />
            </div>

            <div className="w-full">
                <Suspense fallback={<div>Loading clients...</div>}>
                    <ClientList clients={clients} isLoading={loading} />
                </Suspense>
            </div>
        </div>
    );
}
