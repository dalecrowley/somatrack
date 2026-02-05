'use client';

import { useState, useEffect } from 'react';
import { Ticket, Attachment, Comment } from '@/types';
import { useTickets } from '@/hooks/useTickets';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TicketAssigneePicker } from './ticket/TicketAssigneePicker';
import { TicketAttachments } from './ticket/TicketAttachments';
import { TicketComments } from './ticket/TicketComments';
import { Trash2 } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger
} from '@/components/ui/alert-dialog';

interface EditTicketDialogProps {
    ticket: Ticket;
    projectId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function EditTicketDialog({ ticket, projectId, open, onOpenChange }: EditTicketDialogProps) {
    const { editTicket, removeTicket } = useTickets(projectId);
    const [title, setTitle] = useState(ticket.title);
    const [description, setDescription] = useState(ticket.description);
    const [assigneeId, setAssigneeId] = useState<string>(ticket.assigneeId || 'unassigned');
    const [attachments, setAttachments] = useState<Attachment[]>(ticket.attachments || []);
    const [comments, setComments] = useState<Comment[]>(ticket.comments || []);
    const [loading, setLoading] = useState(false);

    // Reset local state when ticket changes or dialog opens
    useEffect(() => {
        if (open) {
            setTitle(ticket.title);
            setDescription(ticket.description);
            setAssigneeId(ticket.assigneeId || 'unassigned');
            setAttachments(ticket.attachments || []);
            setComments(ticket.comments || []);
        }
    }, [open, ticket]);

    const handleSave = async () => {
        setLoading(true);
        try {
            await editTicket(ticket.id, {
                title,
                description,
                assigneeId: assigneeId === 'unassigned' ? undefined : assigneeId, // Handle unassignment
                attachments,
                comments,
            });
            onOpenChange(false);
        } catch (error) {
            console.error('Failed to update ticket', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        setLoading(true);
        try {
            await removeTicket(ticket.id);
            onOpenChange(false);
        } catch (error) {
            console.error('Failed to delete ticket', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col p-0 gap-0">
                <div className="p-6 pb-2">
                    <DialogHeader className="mb-4">
                        <DialogTitle>Edit Ticket</DialogTitle>
                        <DialogDescription>
                            Make changes to your ticket here.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-2 mb-4">
                        <Input
                            className="text-lg font-semibold h-12"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Ticket Title"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6">
                    <Tabs defaultValue="details" className="w-full">
                        <TabsList className="mb-4">
                            <TabsTrigger value="details">Details</TabsTrigger>
                            <TabsTrigger value="attachments">Attachments ({attachments.length})</TabsTrigger>
                            <TabsTrigger value="comments">Comments ({comments.length})</TabsTrigger>
                        </TabsList>

                        <TabsContent value="details" className="space-y-4">
                            <div className="grid gap-2">
                                <Label>Description</Label>
                                <Textarea
                                    rows={6}
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Add a more detailed description..."
                                    className="resize-none"
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label>Assignee</Label>
                                <div className="w-[200px]">
                                    <TicketAssigneePicker
                                        value={assigneeId}
                                        onValueChange={setAssigneeId}
                                    />
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="attachments">
                            <TicketAttachments
                                attachments={attachments}
                                onChange={setAttachments}
                            />
                        </TabsContent>

                        <TabsContent value="comments" className="h-[400px]">
                            <TicketComments
                                comments={comments}
                                onChange={setComments}
                            />
                        </TabsContent>
                    </Tabs>
                </div>

                <DialogFooter className="p-6 pt-2 border-t mt-auto flex sm:justify-between items-center bg-muted/20">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" type="button">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete Ticket?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the ticket "{ticket.title}".
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    Delete
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={loading || !title.trim()}>
                            {loading ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
