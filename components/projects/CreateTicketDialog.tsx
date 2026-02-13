'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTickets } from '@/hooks/useTickets';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, User, Calendar as CalendarIcon } from 'lucide-react';
import { DescriptionEditor } from '@/components/ui/description-editor';
import { TicketAssigneePicker } from './ticket/TicketAssigneePicker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface CreateTicketDialogProps {
    projectId: string;
    defaultSwimlaneId?: string; // Row
    defaultStatusId?: string;   // Column
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    trigger?: React.ReactNode;
}

export function CreateTicketDialog({
    projectId,
    defaultSwimlaneId,
    defaultStatusId,
    open: controlledOpen,
    onOpenChange: controlledOnOpenChange,
    trigger
}: CreateTicketDialogProps) {
    const { user } = useAuth();
    const { addTicket } = useTickets(projectId);
    const [uncontrolledOpen, setUncontrolledOpen] = useState(false);

    // Use controlled state if provided, otherwise local state
    const open = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen;
    const setOpen = controlledOnOpenChange || setUncontrolledOpen;

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
    const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
    const [ticketId, setTicketId] = useState(() => crypto.randomUUID());
    const [loading, setLoading] = useState(false);

    // Reset ticket state when dialog opens
    useEffect(() => {
        if (open) {
            setTitle('');
            setDescription('');
            setAssigneeIds([]);
            setDueDate(undefined);
            setTicketId(crypto.randomUUID());
        }
    }, [open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !user || !projectId) return;

        setLoading(true);
        try {
            const success = await addTicket({
                title,
                description,
                assigneeIds,
                dueDate,
                projectId,
                swimlaneId: defaultSwimlaneId || 'production', // Fallback
                statusId: defaultStatusId || 'todo',         // Fallback
                order: 0,
            }, user.uid, ticketId);

            if (success) {
                setOpen(false);
                setTitle('');
                setDescription('');
                setAssigneeIds([]);
                setDueDate(undefined);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Task
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-none shadow-2xl bg-[#F9FAFB] dark:bg-background">
                <Form onSubmit={handleSubmit}>
                    <DialogHeader className="p-6 pb-4 bg-gradient-to-br from-background to-muted/20 border-b">
                        <DialogTitle className="text-xl font-bold">Create New Ticket</DialogTitle>
                        <DialogDescription className="text-xs">
                            Add a new task to organize your workspace.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-6 p-6">
                        <div className="grid gap-3">
                            <Label htmlFor="ticket-title" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Title
                            </Label>
                            <Input
                                id="ticket-title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="What needs to be done?"
                                className="h-10 border-muted-foreground/20 focus-visible:ring-primary/30"
                                autoFocus
                                required
                            />
                        </div>
                        <div className="grid gap-3">
                            <Label htmlFor="ticket-description" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Description
                            </Label>
                            <div className="bg-white dark:bg-card rounded-md border border-muted-foreground/20 overflow-hidden">
                                <DescriptionEditor
                                    content={description}
                                    onChange={setDescription}
                                    projectId={projectId}
                                    ticketId={ticketId}
                                    placeholder="Add more details and context..."
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-3">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Assignees
                                </Label>
                                <TicketAssigneePicker
                                    value={assigneeIds}
                                    onValueChange={setAssigneeIds}
                                />
                            </div>
                            <div className="grid gap-3">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Due Date
                                </Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="secondary"
                                            className={cn(
                                                "w-full justify-start h-8 px-2 text-xs font-normal transition-colors",
                                                dueDate ? "bg-primary/10 text-primary hover:bg-primary/20" : "bg-muted/40 hover:bg-muted/80 text-foreground/80"
                                            )}
                                        >
                                            <CalendarIcon className={cn("h-3.5 w-3.5 mr-2", dueDate ? "opacity-100" : "opacity-70")} />
                                            {dueDate ? format(dueDate, "PPP") : "Set due date"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={dueDate}
                                            onSelect={setDueDate}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="p-4 bg-muted/10 border-t">
                        <Button
                            type="submit"
                            className="w-full sm:w-auto px-8"
                            disabled={loading || !title.trim()}
                        >
                            {loading ? 'Creating...' : 'Create Ticket'}
                        </Button>
                    </DialogFooter>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function Form({ children, onSubmit }: { children: React.ReactNode; onSubmit: (e: React.FormEvent) => void }) {
    return <form onSubmit={onSubmit}>{children}</form>;
}
