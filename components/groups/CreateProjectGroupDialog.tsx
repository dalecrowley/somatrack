'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProjectGroups } from '@/hooks/useProjectGroups';
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
import { Plus } from 'lucide-react';

interface CreateProjectGroupDialogProps {
    clientId: string;
}

export function CreateProjectGroupDialog({ clientId }: CreateProjectGroupDialogProps) {
    const { user } = useAuth();
    const { addGroup } = useProjectGroups(clientId);
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !user || !clientId) return;

        setLoading(true);
        try {
            const success = await addGroup(name, user.uid);
            if (success) {
                setOpen(false);
                setName('');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Group
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <Form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Add Project Group</DialogTitle>
                        <DialogDescription>
                            Create a new group to organize projects for this client.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="group-name" className="text-right">
                                Name
                            </Label>
                            <Input
                                id="group-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="col-span-3"
                                placeholder="e.g. Marketing, Development"
                                autoFocus
                                required
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading || !name.trim()}>
                            {loading ? 'Creating...' : 'Create Group'}
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
