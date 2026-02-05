'use client';

import { useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';

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
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !user || !projectId) return;

        setLoading(true);
        try {
            const success = await addTicket({
                title,
                description,
                projectId,
                swimlaneId: defaultSwimlaneId || 'production', // Fallback
                statusId: defaultStatusId || 'todo',         // Fallback
                order: 0,
            }, user.uid);

            if (success) {
                setOpen(false);
                setTitle('');
                setDescription('');
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
            <DialogContent className="sm:max-w-[425px]">
                <Form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Create Ticket</DialogTitle>
                        <DialogDescription>
                            Add a new task to this column.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="ticket-title">
                                Title
                            </Label>
                            <Input
                                id="ticket-title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Task title"
                                autoFocus
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="ticket-description">
                                Description
                            </Label>
                            <Textarea
                                id="ticket-description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Add more details..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading || !title.trim()}>
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
