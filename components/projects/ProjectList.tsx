'use client';

import Link from 'next/link';
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { MoreHorizontal, FolderOpen, Trash2, Edit2, Folder, Layout, Archive } from 'lucide-react';
import { Project } from '@/types';
import { useProjects } from '@/hooks/useProjects';
import { EditProjectDialog } from './EditProjectDialog';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { getColorFromId } from '@/lib/utils/colors';

interface ProjectListProps {
    projects: Project[];
    isLoading: boolean;
    clientId: string;
}

export function ProjectList({ projects, isLoading, clientId }: ProjectListProps) {
    const { removeProject, archiveProject } = useProjects(clientId);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [editingProject, setEditingProject] = useState<Project | null>(null);

    const handleDelete = async () => {
        if (deleteId) {
            await removeProject(deleteId);
            setDeleteId(null);
        }
    };

    if (isLoading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                    <Card key={i} className="animate-pulse">
                        <CardHeader className="h-[100px] bg-muted/50 border-t-4 border-muted" />
                        <CardContent className="h-[50px]" />
                    </Card>
                ))}
            </div>
        );
    }

    if (projects.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center animate-in fade-in-50">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <FolderOpen className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">No projects yet</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                    Create a project for this client.
                </p>
            </div>
        );
    }

    return (
        <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {projects.map((project) => {
                    const projectColor = getColorFromId(project.id);
                    return (
                        <Card
                            key={project.id}
                            className="group relative overflow-hidden transition-all hover:shadow-md border-t-4"
                            style={{ borderTopColor: projectColor }}
                        >
                            <Link
                                href={`/clients/${clientId}/projects/${project.id}`}
                                className="absolute inset-0 z-10"
                            >
                                <span className="sr-only">View {project.name}</span>
                            </Link>

                            <CardHeader>
                                <div className="flex items-start justify-between space-y-0">
                                    <CardTitle className="text-xl font-bold truncate pr-8">{project.name}</CardTitle>
                                    <div className="relative z-20">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <span className="sr-only">Open menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingProject(project);
                                                    }}
                                                >
                                                    <Edit2 className="mr-2 h-4 w-4" />
                                                    Rename
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        archiveProject(project.id, clientId);
                                                    }}
                                                >
                                                    <Archive className="mr-2 h-4 w-4" />
                                                    Archive
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    className="text-red-600"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDeleteId(project.id);
                                                    }}
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                                <CardDescription className="flex flex-col gap-1">
                                    <span>Created {project.createdAt ? formatDistanceToNow(project.createdAt.toDate(), { addSuffix: true }) : 'recently'}</span>
                                    {project.description && (
                                        <span className="text-xs line-clamp-2 opacity-70 mt-1">
                                            {project.description.replace(/<[^>]*>/g, '')}
                                        </span>
                                    )}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {project.logoUrl ? (
                                    <div className={`h-20 w-full rounded-xl border border-muted-foreground/10 flex items-center justify-center transition-colors ${project.logoUseDarkBackground ? 'bg-zinc-900 border-zinc-800' : 'bg-white/50'
                                        }`}>
                                        <img src={project.logoUrl} alt={`${project.name} logo`} className="max-h-[70%] max-w-[90%] object-contain" />
                                    </div>
                                ) : (
                                    <div className="h-20 w-full flex items-center justify-start opacity-10">
                                        <Layout className="h-12 w-12 ml-4" style={{ color: projectColor }} />
                                    </div>
                                )}
                                <div className="flex items-center text-sm text-muted-foreground pt-2">
                                    <Layout className="mr-2 h-4 w-4" style={{ color: projectColor }} />
                                    <span>View Board</span>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the project
                            and all associated tasks.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <EditProjectDialog
                project={editingProject}
                open={!!editingProject}
                onOpenChange={(open) => !open && setEditingProject(null)}
                clientId={clientId}
            />
        </>
    );
}
