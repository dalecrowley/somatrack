import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Draggable } from '@hello-pangea/dnd';
import { Ticket } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format, isPast, isToday } from 'date-fns';
import { MessageSquare, Calendar, Pencil } from 'lucide-react';
import { EditTicketDialog } from './EditTicketDialog';
import { useUsers } from '@/hooks/useUsers';
import { cn } from '@/lib/utils';

interface TicketCardProps {
    ticket: Ticket;
    index: number;
    projectName?: string;
    clientName?: string;
    color?: string;
    statusLabel?: string;
}

export function TicketCard({ ticket, index, projectName, clientName, color, statusLabel }: TicketCardProps) {
    const [isEditOpen, setIsEditOpen] = useState(false);
    const { users } = useUsers();

    // Helper to strip HTML tags for card preview
    const stripHtml = (html: string) => {
        if (typeof document === 'undefined') return html.replace(/<[^>]*>?/gm, '');
        const tmp = document.createElement('DIV');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || "";
    };

    // Find assigned users
    const assignedUsers = useMemo(() => {
        const ids = new Set<string>();
        if (ticket.assigneeIds && ticket.assigneeIds.length > 0) {
            ticket.assigneeIds.forEach(id => ids.add(id));
        } else if (ticket.assigneeId) {
            ids.add(ticket.assigneeId);
        }

        if (ids.size === 0) return [];
        return users.filter(u => ids.has(u.uid));
    }, [ticket.assigneeIds, ticket.assigneeId, users]);

    const dueDate = ticket.dueDate ? new Date(ticket.dueDate.seconds * 1000) : null;
    const isOverdue = dueDate ? isPast(dueDate) && !isToday(dueDate) : false;

    // We can use the status color to tint the background subtly or use it for the pill badge
    const badgeColor = color || '#3b82f6'; // default primary

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
                            <div
                                className={cn(
                                    "bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-5 shadow-[0px_1px_3px_rgba(0,0,0,0.1)] hover:shadow-xl transition-all cursor-pointer group border border-transparent hover:border-primary/30",
                                    snapshot.isDragging && "shadow-2xl ring-2 ring-primary/30 rotate-2 scale-105"
                                )}
                                style={{
                                    transition: snapshot.isDragging ? 'none' : 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                    width: snapshot.isDragging ? ((provided.draggableProps.style as any)?.width || '300px') : 'auto'
                                }}
                            >
                                {/* Top area: Badge and Drag handle */}
                                <div className="flex justify-between items-start mb-3">
                                    {statusLabel ? (
                                        <span 
                                            className="text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-tighter shadow-sm"
                                            style={{ backgroundColor: badgeColor }}
                                        >
                                            {statusLabel}
                                        </span>
                                    ) : (
                                        <div /> // Spacer
                                    )}
                                    <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                        drag_indicator
                                    </span>
                                </div>
                                
                                <h4 className="text-slate-900 dark:text-white font-semibold text-[15px] leading-snug mb-2 group-hover:text-primary transition-colors">
                                    {ticket.title}
                                </h4>
                                
                                {ticket.description && (
                                    <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-2 mb-4 leading-relaxed">
                                        {stripHtml(ticket.description)}
                                    </p>
                                )}

                                <div className="flex justify-between items-end mt-4 pt-2 border-t border-slate-100 dark:border-slate-700">
                                    <div className="flex items-center gap-3">
                                        {dueDate && (
                                            <div className={cn(
                                                "flex items-center gap-1 text-[11px] font-bold",
                                                isOverdue ? "text-error" : "text-slate-500 dark:text-slate-400"
                                            )} title={isOverdue ? "Overdue" : "Due date"}>
                                                <span className="material-symbols-outlined text-[14px]">schedule</span>
                                                {format(dueDate, "MMM d")}
                                            </div>
                                        )}
                                        {ticket.comments && ticket.comments.length > 0 && (
                                            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                                <span className="material-symbols-outlined text-[14px]">chat_bubble</span>
                                                {ticket.comments.length}
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="flex -space-x-1.5">
                                        {assignedUsers.length > 0 && assignedUsers.slice(0, 3).map((user: any, idx: number) => (
                                            <img 
                                                key={user.uid}
                                                src={user.photoURL || undefined}
                                                alt={user.displayName || user.email}
                                                className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-800 shadow-sm object-cover"
                                                style={{ zIndex: assignedUsers.length - idx }}
                                                title={user.displayName}
                                                onError={(e) => {
                                                    // Fallback to initial if image fails
                                                    e.currentTarget.style.display = 'none';
                                                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                                }}
                                            />
                                        ))}
                                        {assignedUsers.length > 3 && (
                                            <div className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-800 bg-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-600" style={{ zIndex: 0 }}>
                                                +{assignedUsers.length - 3}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
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
                clientName={clientName}
                open={isEditOpen}
                onOpenChange={setIsEditOpen}
                color={color}
            />
        </>
    );
}
