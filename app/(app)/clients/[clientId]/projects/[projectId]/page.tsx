'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronRight, ArrowLeft, MoreHorizontal } from 'lucide-react';
import { useProject } from '@/hooks/useProject';
import { ProjectBoard } from '@/components/projects/ProjectBoard';
import { ProjectSettingsDialog } from '@/components/projects/ProjectSettingsDialog';
import { getClient } from '@/lib/services/client';
import { Client } from '@/types';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function ProjectPage() {
    const params = useParams();
    const clientId = params.clientId as string;
    const projectId = params.projectId as string;
    const { project, loading: projectLoading } = useProject(projectId);
    const [client, setClient] = useState<Client | null>(null);
    const [settingsOpen, setSettingsOpen] = useState(false);

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

    if (projectLoading) {
        return <div className="p-8">Loading project...</div>;
    }

    if (!project) {
        return (
            <div className="container py-8">
                <div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-lg">
                    <p className="text-muted-foreground mb-4">Project not found</p>
                    <Link href={`/clients/${clientId}/projects`}>
                        <Button>Return to Projects</Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            <div className="border-b px-6 py-4 flex items-center justify-between bg-card text-card-foreground">
                <div className="space-y-1">
                    <div className="flex items-center text-sm text-muted-foreground">
                        <Link href="/clients" className="hover:text-foreground transition-colors">
                            Clients
                        </Link>
                        <ChevronRight className="mx-2 h-4 w-4" />
                        <Link href={`/clients/${clientId}/projects`} className="hover:text-foreground transition-colors">
                            {client?.name || 'Loading...'}
                        </Link>
                        <ChevronRight className="mx-2 h-4 w-4" />
                        <span className="font-medium text-foreground">{project.name}</span>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
                </div>

                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                                Settings
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">Delete Project</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <div className="flex-1 overflow-hidden">
                <Suspense fallback={<div>Loading board...</div>}>
                    <ProjectBoard projectId={projectId} />
                </Suspense>
            </div>

            {settingsOpen && (
                <ProjectSettingsDialog
                    open={settingsOpen}
                    onOpenChange={setSettingsOpen}
                    projectId={projectId}
                />
            )}
        </div>
    );
}
