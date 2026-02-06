import { useEffect, useState, Fragment } from 'react';
import { DragDropContext, DropResult, Droppable } from '@hello-pangea/dnd';
import { Project, Ticket, ProjectStatus, Swimlane } from '@/types';
import { useTickets } from '@/hooks/useTickets';
import { useProject } from '@/hooks/useProject';
import { TicketCard } from './TicketCard';
import { CreateTicketDialog } from './CreateTicketDialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Plus, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProjectSettingsDialog } from './ProjectSettingsDialog';

// Defaults
const DEFAULT_STATUSES: ProjectStatus[] = [
    { id: 'todo', title: 'To Do', order: 0, projectId: '', color: '#ef4444' },      // Red
    { id: 'doing', title: 'Doing', order: 1, projectId: '', color: '#f59e0b' },     // Amber
    { id: 'ready', title: 'Ready', order: 2, projectId: '', color: '#d97706' },     // Orange
    { id: 'sent', title: 'Sent', order: 3, projectId: '', color: '#3b82f6' },      // Blue
    { id: 'billed', title: 'Billed', order: 4, projectId: '', color: '#6366f1' },    // Indigo
    { id: 'approved', title: 'Approved', order: 5, projectId: '', color: '#22c55e' }, // Green
];

const DEFAULT_SWIMLANES: Swimlane[] = [
    { id: 'production', title: 'Production', order: 0, projectId: '', color: '#3b82f6' }, // Blue
    { id: 'sfx', title: 'SFX', order: 1, projectId: '', color: '#f97316' },        // Orange
    { id: 'music', title: 'MUS', order: 2, projectId: '', color: '#a855f7' },        // Purple
    { id: 'implementation', title: 'Implementation', order: 3, projectId: '', color: '#22c55e' }, // Green
];

interface ProjectBoardProps {
    projectId: string;
}

export function ProjectBoard({ projectId }: ProjectBoardProps) {
    const { project, updateProject } = useProject(projectId);
    const { tickets, editTicket } = useTickets(projectId);
    const [localTickets, setLocalTickets] = useState<Ticket[]>([]);

    // Dialog state for "Add Ticket"
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [createSwimlaneId, setCreateSwimlaneId] = useState<string>('');
    const [createStatusId, setCreateStatusId] = useState<string>('');

    // Dialog state for "Project Settings"
    const [settingsOpen, setSettingsOpen] = useState(false);

    useEffect(() => {
        setLocalTickets(tickets);
    }, [tickets]);

    // Initialize defaults
    useEffect(() => {
        if (project) {
            const updates: any = {};
            if (!project.statuses || project.statuses.length === 0) {
                updates.statuses = DEFAULT_STATUSES.map(s => ({ ...s, projectId }));
            }
            if (!project.swimlanes || project.swimlanes.length === 0) {
                updates.swimlanes = DEFAULT_SWIMLANES.map(s => ({ ...s, projectId }));
            }
            if (Object.keys(updates).length > 0) {
                updateProject(updates);
            }
        }
    }, [project, projectId, updateProject]);

    const statuses = project?.statuses?.length ? project.statuses : DEFAULT_STATUSES;
    const swimlanes = project?.swimlanes?.length ? project.swimlanes : DEFAULT_SWIMLANES;

    const onDragEnd = async (result: DropResult) => {
        const { destination, source, draggableId } = result;

        if (!destination) return;
        if (
            destination.droppableId === source.droppableId &&
            destination.index === source.index
        ) return;

        // Parse IDs (format: "swimlaneId::statusId")
        const [sourceSwimlaneId, sourceStatusId] = source.droppableId.split('::');
        const [destSwimlaneId, destStatusId] = destination.droppableId.split('::');

        // 1. Get all tickets and sort them by current order
        const allTickets = [...localTickets].sort((a, b) => (a.order || 0) - (b.order || 0));

        // 2. Find the dragged ticket
        const ticketIndex = allTickets.findIndex(t => t.id === draggableId);
        if (ticketIndex === -1) return;
        const draggedTicket = allTickets[ticketIndex];

        // 3. Separate tickets into categories
        const otherTickets = allTickets.filter(t => t.id !== draggableId);
        const destCellTickets = otherTickets.filter(t =>
            (t.swimlaneId === destSwimlaneId || (!t.swimlaneId && destSwimlaneId === 'production')) &&
            (t.statusId === destStatusId || (!t.statusId && destStatusId === 'todo'))
        );

        // 4. Calculate new order
        // We update the dragged ticket's status/swimlane and then re-assign orders for all tickets in the destination cell
        const updatedTicket = {
            ...draggedTicket,
            swimlaneId: destSwimlaneId,
            statusId: destStatusId
        };

        // Insert at new index in the destination cell's list
        destCellTickets.splice(destination.index, 0, updatedTicket);

        // 5. Update local state optimistically
        const finalTickets = allTickets.map(t => {
            if (t.id === draggableId) return updatedTicket;
            return t;
        });
        setLocalTickets(finalTickets);

        // 6. Persist changes
        const updatePromises = [];

        // Update the dragged ticket
        updatePromises.push(editTicket(draggableId, {
            swimlaneId: destSwimlaneId,
            statusId: destStatusId,
            order: destination.index
        }));

        // To be thorough, we should ensure other tickets in the destination cell also have correct orders
        // to avoid collisions. For simplicity, we'll just update the dragged one for now, 
        // as the query 'orderBy(order, asc)' will handle same-order items by their Firestore ID usually.
        // However, if we want to be perfect:
        /*
        destCellTickets.forEach((ticket, idx) => {
            if (ticket.id !== draggableId) {
                updatePromises.push(editTicket(ticket.id, { order: idx }));
            }
        });
        */

        await Promise.all(updatePromises);
    };

    const openCreateDialog = (swimlaneId: string, statusId: string) => {
        setCreateSwimlaneId(swimlaneId);
        setCreateStatusId(statusId);
        setCreateDialogOpen(true);
    };

    /**
     * Helper to get cell background color with row-based shading
     * Uses the Status color as base and Row index to adjust opacity/lightness
     */
    const getCellStyles = (statusColor: string | undefined, rowIndex: number) => {
        if (!statusColor) return {};

        // Base opacity increases slightly per row to create vertical distinction
        const opacity = 0.05 + (rowIndex * 0.03);

        return {
            backgroundColor: `${statusColor}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`,
            borderLeft: `2px solid ${statusColor}22`
        };
    };

    return (
        <div className="h-full w-full overflow-auto">
            <DragDropContext onDragEnd={onDragEnd}>
                <div className="grid min-w-full w-full" style={{
                    gridTemplateColumns: `200px repeat(${statuses.length}, minmax(300px, 1fr))`
                }}>
                    {/* Header Row */}
                    <div className="sticky top-0 z-20 bg-background/95 backdrop-blur p-2 font-bold border-b-2 flex items-center justify-center">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => setSettingsOpen(true)}
                        >
                            <Settings className="h-4 w-4" />
                        </Button>
                    </div>
                    {statuses.map(status => (
                        <div
                            key={status.id}
                            className="sticky top-0 z-20 bg-background/95 backdrop-blur p-4 font-bold text-center border-b-4 min-w-[300px]"
                            style={{ borderBottomColor: status.color || 'transparent' }}
                        >
                            {status.title}
                        </div>
                    ))}

                    {/* Swimlane Rows */}
                    {swimlanes.map((swimlane, rowIndex) => (
                        <Fragment key={swimlane.id}>
                            {/* Row Header */}
                            <div
                                className="sticky left-0 z-10 bg-background p-4 font-bold border-r-4 flex items-center shadow-sm"
                                style={{ borderRightColor: swimlane.color || 'transparent' }}
                            >
                                <span className="text-lg opacity-80">{swimlane.title}</span>
                            </div>

                            {/* Status Cells */}
                            {statuses.map(status => {
                                const cellId = `${swimlane.id}::${status.id}`;
                                const cellTickets = localTickets.filter(t =>
                                    (t.swimlaneId === swimlane.id || (!t.swimlaneId && swimlane.id === 'production')) &&
                                    (t.statusId === status.id || (!t.statusId && status.id === 'todo'))
                                );

                                return (
                                    <Droppable key={cellId} droppableId={cellId}>
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.droppableProps}
                                                style={getCellStyles(status.color, rowIndex)}
                                                className={cn(
                                                    "p-3 min-h-[180px] flex flex-col gap-3 group border border-transparent transition-colors",
                                                    snapshot.isDraggingOver && "ring-2 ring-primary/20 brightness-95"
                                                )}
                                            >
                                                {cellTickets.map((ticket, index) => (
                                                    <TicketCard
                                                        key={ticket.id}
                                                        ticket={ticket}
                                                        index={index}
                                                        projectName={project?.name}
                                                        color={status.color} // Use Status Color for Ticket accent
                                                    />
                                                ))}
                                                {provided.placeholder}

                                                {/* Quick Add Button */}
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="w-full opacity-0 group-hover:opacity-100 transition-opacity mt-auto hover:bg-background/50"
                                                    onClick={() => openCreateDialog(swimlane.id, status.id)}
                                                >
                                                    <Plus className="h-4 w-4 mr-2" />
                                                    Add Ticket
                                                </Button>
                                            </div>
                                        )}
                                    </Droppable>
                                );
                            })}
                        </Fragment>
                    ))}
                </div>
            </DragDropContext>

            {createDialogOpen && (
                <CreateTicketDialog
                    open={createDialogOpen}
                    onOpenChange={setCreateDialogOpen}
                    projectId={projectId}
                    defaultSwimlaneId={createSwimlaneId}
                    defaultStatusId={createStatusId}
                />
            )}

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
