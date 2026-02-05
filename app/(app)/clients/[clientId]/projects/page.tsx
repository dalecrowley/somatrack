'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { ProjectList } from '@/components/projects/ProjectList';
import { CreateProjectDialog } from '@/components/projects/CreateProjectDialog';
import { getClient } from '@/lib/services/client'; // Server-side function, but usable in client components
import { Client } from '@/types';

export default function ProjectsPage() {
    const params = useParams();
    const clientId = params.clientId as string;
    const { projects, loading: projectsLoading } = useProjects(clientId);
    const [client, setClient] = useState<Client | null>(null);

    // Fetch client details for the header
    useEffect(() => {
        const fetchClient = async () => {
            if (clientId) {
                const data = await getClient(clientId);
                setClient(data);
            }
        };
        fetchClient();
    }, [clientId]);

    return (
        <div className="container py-8 space-y-8">
            {/* Breadcrumb Navigation */}
            <div className="flex items-center text-sm text-muted-foreground">
                <Link href="/clients" className="hover:text-foreground transition-colors flex items-center">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Clients
                </Link>
                <ChevronRight className="mx-2 h-4 w-4" />
                <span className="font-medium text-foreground">{client?.name || 'Loading...'}</span>
            </div>

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage projects for <span className="font-semibold text-foreground">{client?.name}</span>
                    </p>
                </div>
                <CreateProjectDialog clientId={clientId} />
            </div>

            <div className="w-full">
                <Suspense fallback={<div>Loading projects...</div>}>
                    <ProjectList
                        projects={projects}
                        isLoading={projectsLoading}
                        clientId={clientId}
                    />
                </Suspense>
            </div>
        </div>
    );
}
