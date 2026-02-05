'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { MoreHorizontal, Folder, Trash2, Edit2 } from 'lucide-react';
import { Client } from '@/types';
import { useClients } from '@/hooks/useClients';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
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
import { useState } from 'react';

import { EditClientDialog } from './EditClientDialog';

interface ClientListProps {
    clients: Client[];
    isLoading: boolean;
}

export function ClientList({ clients, isLoading }: ClientListProps) {
    const { removeClient } = useClients();
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [editingClient, setEditingClient] = useState<Client | null>(null);

    const handleDelete = async () => {
        if (deleteId) {
            await removeClient(deleteId);
            setDeleteId(null);
        }
    };

    if (isLoading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                    <Card key={i} className="animate-pulse">
                        <CardHeader className="h-[100px] bg-muted/50" />
                        <CardContent className="h-[50px]" />
                    </Card>
                ))}
            </div>
        );
    }

    if (clients.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center animate-in fade-in-50">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <Folder className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">No clients yet</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                    Get started by adding your first client.
                </p>
            </div>
        );
    }

    return (
        <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {clients.map((client) => (
                    <Card key={client.id} className="group relative overflow-hidden transition-all hover:shadow-md">
                        <Link href={`/clients/${client.id}/projects`} className="absolute inset-0 z-10">
                            <span className="sr-only">View {client.name}</span>
                        </Link>

                        <CardHeader>
                            <div className="flex items-start justify-between space-y-0">
                                <CardTitle className="text-xl font-bold truncate pr-8">{client.name}</CardTitle>
                                <div className="relative z-20">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <span className="sr-only">Open menu</span>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingClient(client);
                                            }}>
                                                <Edit2 className="mr-2 h-4 w-4" />
                                                Rename
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                className="text-red-600"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDeleteId(client.id);
                                                }}
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                            <CardDescription>
                                Created {client.createdAt ? formatDistanceToNow(client.createdAt.toDate(), { addSuffix: true }) : 'recently'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center text-sm text-muted-foreground">
                                <Folder className="mr-2 h-4 w-4" />
                                <span>View Projects</span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the client
                            and all associated projects.
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

            <EditClientDialog
                client={editingClient}
                open={!!editingClient}
                onOpenChange={(open) => !open && setEditingClient(null)}
            />
        </>
    );
}
