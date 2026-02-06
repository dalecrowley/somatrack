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
import { Trash2, Edit2, ChevronLeft } from 'lucide-react';
import { Linkify } from '@/components/ui/linkify';
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
    projectName?: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function EditTicketDialog({ ticket, projectId, projectName, open, onOpenChange }: EditTicketDialogProps) {
    const { editTicket, removeTicket } = useTickets(projectId);
    const [title, setTitle] = useState(ticket.title);
    const [description, setDescription] = useState(ticket.description);
    const [assigneeId, setAssigneeId] = useState<string | null>(ticket.assigneeId || 'unassigned');
    const [attachments, setAttachments] = useState<Attachment[]>(ticket.attachments || []);
    const [comments, setComments] = useState<Comment[]>(ticket.comments || []);
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Reset local state when ticket changes or dialog opens
    useEffect(() => {
        if (open) {
            setTitle(ticket.title);
            setDescription(ticket.description);
            setAssigneeId(ticket.assigneeId || 'unassigned');
            setAttachments(ticket.attachments || []);
            setComments(ticket.comments || []);
            setIsEditing(false); // Always start in view mode
        }
    }, [open, ticket]);

    const handleSave = async () => {
        setLoading(true);
        try {
            await editTicket(ticket.id, {
                title,
                description,
                assigneeId: assigneeId === 'unassigned' ? null : assigneeId,
                attachments,
                comments,
            });
            setIsEditing(false);
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
            <DialogContent className="sm:max-w-[600px] h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
                {/* Accessibility labels */}
                <DialogHeader className="sr-only">
                    <DialogTitle>{isEditing ? `Editing: ${title}` : title}</DialogTitle>
                    <DialogDescription>Ticket details and management</DialogDescription>
                </DialogHeader>

                {/* Header Section */}
                <div className="p-6 pb-2 border-b bg-muted/5">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                            <span>Ticket</span>
                            <span>•</span>
                            <span className="text-primary">{ticket.id.slice(0, 8)}</span>
                        </div>
                        {isEditing && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsEditing(false)}
                                className="h-8 px-2"
                            >
                                <ChevronLeft className="h-4 w-4 mr-1" />
                                Back to View
                            </Button>
                        )}
                    </div>

                    {isEditing ? (
                        <div className="grid gap-2">
                            <Input
                                className="text-lg font-bold h-auto py-1 px-2 -ml-2 bg-transparent border-transparent focus-visible:border-input focus-visible:ring-0"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Ticket Title"
                                autoFocus
                            />
                        </div>
                    ) : (
                        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
                    )}
                </div>

                {/* Content Section */}
                <div className="flex-1 overflow-y-auto p-6 pt-4">
                    <Tabs defaultValue="details" className="w-full">
                        <TabsList className="mb-4">
                            <TabsTrigger value="details">Details</TabsTrigger>
                            <TabsTrigger value="attachments">Attachments ({attachments.length})</TabsTrigger>
                            <TabsTrigger value="comments">Comments ({comments.length})</TabsTrigger>
                        </TabsList>

                        <TabsContent value="details" className="space-y-6">
                            {/* Description */}
                            <div className="grid gap-3">
                                <Label className="text-muted-foreground flex items-center justify-between">
                                    Description
                                    {!isEditing && description && (
                                        <span className="text-[10px] font-normal opacity-50">Click to read more</span>
                                    )}
                                </Label>
                                {isEditing ? (
                                    <Textarea
                                        rows={8}
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Add a more detailed description..."
                                        className="resize-none focus-visible:ring-1"
                                    />
                                ) : (
                                    <div className="bg-muted/30 rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap min-h-[100px] border">
                                        {description ? (
                                            <Linkify text={description} />
                                        ) : (
                                            <span className="text-muted-foreground italic">No description provided.</span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Assignee */}
                            <div className="grid gap-3 pt-2">
                                <Label className="text-muted-foreground">Assignee</Label>
                                <div className="w-[200px]">
                                    <TicketAssigneePicker
                                        value={assigneeId || 'unassigned'}
                                        onValueChange={isEditing ? setAssigneeId : () => { }}
                                        disabled={!isEditing}
                                    />
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="attachments">
                            <TicketAttachments
                                attachments={attachments}
                                onChange={isEditing ? setAttachments : () => { }}
                                readOnly={!isEditing}
                                projectId={projectId}
                                projectName={projectName}
                                ticketId={ticket.id}
                            />
                        </TabsContent>

                        <TabsContent value="comments" className="min-h-[300px]">
                            <TicketComments
                                comments={comments}
                                onChange={setComments}
                            />
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Footer Section */}
                <DialogFooter className="p-4 px-6 border-t mt-auto flex sm:justify-between items-center bg-muted/20">
                    <div className="flex gap-2 w-full justify-between items-center">
                        <div>
                            {isEditing ? (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Delete Ticket
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
                            ) : (
                                <p className="text-[10px] text-muted-foreground">
                                    Last updated: {ticket.updatedAt ? new Date(ticket.updatedAt.toDate()).toLocaleString() : 'Just now'}
                                </p>
                            )}
                        </div>

                        <div className="flex gap-2">
                            {!isEditing ? (
                                <>
                                    <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Close</Button>
                                    <Button size="sm" onClick={() => setIsEditing(true)}>
                                        <Edit2 className="h-4 w-4 mr-2" />
                                        Edit Ticket
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
                                    <Button size="sm" onClick={handleSave} disabled={loading || !title.trim()}>
                                        {loading ? 'Saving...' : 'Save Changes'}
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
