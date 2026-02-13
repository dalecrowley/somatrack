import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Draggable } from '@hello-pangea/dnd';
import { Ticket } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format, isPast, isToday } from 'date-fns';
import { User as UserIcon, MessageSquare, Calendar, Pencil } from 'lucide-react';
import { EditTicketDialog } from './EditTicketDialog';
import { useUsers } from '@/hooks/useUsers';
import { cn } from '@/lib/utils';

interface TicketCardProps {
    ticket: Ticket;
    index: number;
    projectName?: string;
    color?: string;
    statusLabel?: string;
}

export function TicketCard({ ticket, index, projectName, color, statusLabel }: TicketCardProps) {
    const [isEditOpen, setIsEditOpen] = useState(false);
    const { users } = useUsers();

    // Helper to strip HTML tags for card preview
    const stripHtml = (html: string) => {
        if (typeof document === 'undefined') return html.replace(/<[^>]*>?/gm, '');
        const tmp = document.createElement('DIV');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || "";
    };

    // Find assigned users with improved detection for legacy and multi-assign
    const assignedUsers = useMemo(() => {
        const ids = new Set<string>();
        if (ticket.assigneeIds && ticket.assigneeIds.length > 0) {
            ticket.assigneeIds.forEach(id => ids.add(id));
        } else if (ticket.assigneeId) {
            ids.add(ticket.assigneeId);
        }

        if (ids.size === 0) return [];

        const matched = users.filter(u => ids.has(u.uid));

        // Debugging logs to verify assignment data
        console.log(`🔍 [TicketCard:${ticket.id}] Assigned Users:`, matched.map(u => u.displayName || u.email));

        return matched;
    }, [ticket.assigneeIds, ticket.assigneeId, users]);

    const dueDate = ticket.dueDate ? new Date(ticket.dueDate.seconds * 1000) : null;
    const isOverdue = dueDate ? isPast(dueDate) && !isToday(dueDate) : false;

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
                                    "cursor-pointer active:cursor-grabbing transition-all duration-200 group bg-card hover:shadow-md hover:-translate-y-0.5 overflow-hidden border-none shadow-sm",
                                    snapshot.isDragging && "shadow-2xl ring-2 ring-primary/30 rotate-2 scale-105"
                                )}
                                style={{
                                    transition: snapshot.isDragging ? 'none' : 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                    width: snapshot.isDragging ? ((provided.draggableProps.style as any)?.width || '300px') : 'auto'
                                }}
                            >
                                {/* Status Banner */}
                                {statusLabel && (
                                    <div
                                        className="h-6 flex items-center justify-center px-3"
                                        style={{ backgroundColor: color || '#7FB3B3' }}
                                    >
                                        <span className="text-white text-[9px] font-bold tracking-[0.1em] uppercase truncate">
                                            {statusLabel}
                                        </span>
                                    </div>
                                )}

                                <CardContent className="p-4 space-y-3">
                                    <h3 className="text-sm font-semibold leading-tight break-words group-hover:text-primary transition-colors">
                                        {ticket.title}
                                    </h3>

                                    {ticket.description && (
                                        <div className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                            {stripHtml(ticket.description)}
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between pt-2">
                                        {/* Utility Icons (Left) */}
                                        <div className="flex items-center gap-3 text-muted-foreground/60">
                                            {ticket.description && (
                                                <Pencil className="h-3.5 w-3.5" />
                                            )}
                                            {ticket.comments && ticket.comments.length > 0 && (
                                                <div className="flex items-center gap-1" title={`${ticket.comments.length} comments`}>
                                                    <MessageSquare className="h-3.5 w-3.5" />
                                                    <span className="text-[10px] font-medium">{ticket.comments.length}</span>
                                                </div>
                                            )}
                                            {dueDate && (
                                                <div className={cn(
                                                    "flex items-center gap-1 text-[10px] font-medium",
                                                    isOverdue ? "text-destructive" : "text-muted-foreground/60"
                                                )} title={isOverdue ? "Overdue" : "Due date"}>
                                                    <Calendar className="h-3 w-3" />
                                                    <span>{format(dueDate, "MMM d")}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Assignees (Right) */}
                                        <div className="flex items-center -space-x-2">
                                            {assignedUsers.length > 0 && assignedUsers.slice(0, 3).map((user: any, idx: number) => (
                                                <Avatar key={user.uid} className="h-7 w-7 border-2 border-background shadow-sm" style={{ zIndex: assignedUsers.length - idx }}>
                                                    <AvatarImage src={user.photoURL || undefined} />
                                                    <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                                                        {user.displayName?.[0] || user.email?.[0] || 'U'}
                                                    </AvatarFallback>
                                                </Avatar>
                                            ))}
                                            {assignedUsers.length > 3 && (
                                                <div className="h-7 w-7 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[9px] font-semibold text-muted-foreground" style={{ zIndex: 0 }}>
                                                    +{assignedUsers.length - 3}
                                                </div>
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
                projectName={projectName}
                open={isEditOpen}
                onOpenChange={setIsEditOpen}
                color={color}
            />
        </>
    );
}
