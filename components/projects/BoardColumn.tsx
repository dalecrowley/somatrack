'use client';

import { Droppable } from '@hello-pangea/dnd';
import { Ticket } from '@/types';
import { TicketCard } from './TicketCard';
import { CreateTicketDialog } from './CreateTicketDialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface BoardColumnProps {
    id: string;
    title: string;
    tickets: Ticket[];
    projectId: string;
    color?: string;
}

export function BoardColumn({ id, title, tickets, projectId, color }: BoardColumnProps) {
    return (
        <div className="flex flex-col h-full w-80 bg-muted/30 rounded-lg border mr-4 shrink-0 max-h-full">
            <div className={`p-4 font-semibold text-sm flex items-center justify-between shrink-0 border-t-4 rounded-t-lg ${!color ? 'border-transparent' : ''}`}
                style={{ borderColor: color }}
            >
                {title}
                <span className="text-muted-foreground text-xs bg-muted px-2 py-0.5 rounded-full">
                    {tickets.length}
                </span>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden relative">
                <ScrollArea className="h-full">
                    <Droppable droppableId={id}>
                        {(provided, snapshot) => (
                            <div
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                className={`p-3 min-h-[150px] transition-colors ${snapshot.isDraggingOver ? 'bg-muted/50' : ''
                                    }`}
                            >
                                {tickets.map((ticket, index) => (
                                    <TicketCard
                                        key={ticket.id}
                                        ticket={ticket}
                                        index={index}
                                        color={color}
                                        statusLabel={title}
                                    />
                                ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </ScrollArea>
            </div>

            <div className="p-3 mt-auto border-t shrink-0">
                <CreateTicketDialog projectId={projectId} columnId={id} />
            </div>
        </div>
    );
}
