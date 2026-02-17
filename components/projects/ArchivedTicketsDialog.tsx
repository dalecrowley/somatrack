'use client';

import { useState } from 'react';
import { useArchivedTickets, useTickets } from '@/hooks/useTickets';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Archive, RotateCcw, Trash2, Loader2, Inbox } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
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

interface ArchivedTicketsDialogProps {
    projectId: string;
    projectName?: string;
    trigger?: React.ReactNode;
}

export function ArchivedTicketsDialog({ projectId, projectName, trigger }: ArchivedTicketsDialogProps) {
    const { tickets: archivedTickets, loading } = useArchivedTickets(projectId);
    const { unarchiveTicket, removeTicket } = useTickets(projectId);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [open, setOpen] = useState(false);

    const handleUnarchive = async (ticketId: string) => {
        await unarchiveTicket(ticketId);
    };

    const handleDelete = async () => {
        if (deleteId) {
            await removeTicket(deleteId);
            setDeleteId(null);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm" className="gap-2">
                        <Archive className="h-4 w-4" />
                        Archived
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col p-0">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle>Archived Tickets</DialogTitle>
                    <DialogDescription>
                        Tickets archived in {projectName || 'this project'}. You can restore them to the board or delete them permanently.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden px-6 pb-6">
                    {loading ? (
                        <div className="flex h-full items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : archivedTickets.length === 0 ? (
                        <div className="flex h-full flex-col items-center justify-center text-center space-y-3 opacity-60">
                            <Inbox className="h-12 w-12 text-muted-foreground" />
                            <div>
                                <p className="font-medium text-lg">No archived tickets</p>
                                <p className="text-sm">When you archive tickets, they will appear here.</p>
                            </div>
                        </div>
                    ) : (
                        <ScrollArea className="h-full pr-4">
                            <div className="space-y-3 py-4">
                                {archivedTickets.map((ticket) => (
                                    <div
                                        key={ticket.id}
                                        className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                                    >
                                        <div className="space-y-1 flex-1 min-w-0 pr-4">
                                            <h4 className="font-semibold text-sm truncate">{ticket.title}</h4>
                                            <p className="text-[10px] text-muted-foreground">
                                                Archived {ticket.updatedAt ? formatDistanceToNow(ticket.updatedAt.toDate(), { addSuffix: true }) : 'recently'}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 text-xs gap-1.5 hover:bg-primary/10 hover:text-primary"
                                                onClick={() => handleUnarchive(ticket.id)}
                                            >
                                                <RotateCcw className="h-3.5 w-3.5" />
                                                Restore
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 text-xs gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                onClick={() => setDeleteId(ticket.id)}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                                Delete
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                </div>
            </DialogContent>

            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Permanently?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently remove the ticket and all its data. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Dialog>
    );
}
