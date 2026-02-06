import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Draggable } from '@hello-pangea/dnd';
import { Ticket } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { Paperclip, User as UserIcon, MessageSquare } from 'lucide-react';
import { EditTicketDialog } from './EditTicketDialog';
import { useUsers } from '@/hooks/useUsers';
import { Linkify } from '@/components/ui/linkify';
import { cn } from '@/lib/utils';

interface TicketCardProps {
    ticket: Ticket;
    index: number;
    color?: string;
}

export function TicketCard({ ticket, index, color }: TicketCardProps) {
    const [isEditOpen, setIsEditOpen] = useState(false);
    const { users } = useUsers();

    // Find assigned user if any
    const assignedUser = ticket.assigneeId ? users.find(u => u.uid === ticket.assigneeId) : null;

    // We store the portal target (body) in a ref or just use document.body directly
    // Requirement for @hello-pangea/dnd portals: 
    // https://github.com/hello-pangea/dnd/blob/main/docs/guides/clones.md (or similar logic)

    return (
        <>
            <Draggable draggableId={ticket.id} index={index}>
                {(provided, snapshot) => {
                    const content = (
                        <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className="outline-none"
                            style={provided.draggableProps.style}
                            onClick={() => setIsEditOpen(true)}
                        >
                            <Card
                                className={cn(
                                    "cursor-grab active:cursor-grabbing transition-shadow border-l-4 group bg-card",
                                    snapshot.isDragging && "shadow-xl ring-2 ring-primary/20"
                                )}
                                style={{
                                    borderLeftColor: color || 'transparent',
                                    transition: snapshot.isDragging ? 'none' : 'box-shadow 0.2s, border-color 0.2s',
                                    // Handle width properly when portaled
                                    width: snapshot.isDragging ? ((provided.draggableProps.style as any)?.width || '300px') : 'auto'
                                }}
                            >
                                <CardHeader className="p-3 pb-0 space-y-0 flex flex-row items-start justify-between">
                                    <CardTitle className="text-sm font-medium leading-normal break-words w-full">
                                        {ticket.title}
                                    </CardTitle>
                                </CardHeader>

                                <CardContent className="p-3 pt-2">
                                    {ticket.description && (
                                        <div className="text-xs text-muted-foreground line-clamp-2 mb-2">
                                            <Linkify text={ticket.description} />
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                                        <span className="text-[10px]">
                                            {ticket.createdAt ? formatDistanceToNow(ticket.createdAt.toDate(), { addSuffix: true }) : ''}
                                        </span>

                                        <div className="flex items-center gap-2">
                                            {ticket.attachments && ticket.attachments.length > 0 && (
                                                <div className="flex items-center text-muted-foreground/70" title={`${ticket.attachments.length} attachments`}>
                                                    <Paperclip className="h-3 w-3 mr-0.5" />
                                                    <span className="text-[10px]">{ticket.attachments.length}</span>
                                                </div>
                                            )}

                                            {ticket.comments && ticket.comments.length > 0 && (
                                                <div className="flex items-center text-muted-foreground/70" title={`${ticket.comments.length} comments`}>
                                                    <MessageSquare className="h-3 w-3 mr-0.5" />
                                                    <span className="text-[10px]">{ticket.comments.length}</span>
                                                </div>
                                            )}

                                            {assignedUser && (
                                                <Avatar className="h-5 w-5 border border-background">
                                                    <AvatarImage src={assignedUser.photoURL || undefined} />
                                                    <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                                                        {assignedUser.displayName?.[0] || 'U'}
                                                    </AvatarFallback>
                                                </Avatar>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    );

                    if (snapshot.isDragging) {
                        return createPortal(content, document.body);
                    }

                    return content;
                }}
            </Draggable>

            <EditTicketDialog
                ticket={ticket}
                projectId={ticket.projectId}
                open={isEditOpen}
                onOpenChange={setIsEditOpen}
            />
        </>
    );
}
