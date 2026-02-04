'use client';

import { useState, useEffect } from 'react';
import { ProjectGroup } from '@/types';
import { useProjectGroups } from '@/hooks/useProjectGroups';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface EditProjectGroupDialogProps {
    group: ProjectGroup | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    clientId: string;
}

export function EditProjectGroupDialog({ group, open, onOpenChange, clientId }: EditProjectGroupDialogProps) {
    const { editGroup } = useProjectGroups(clientId);
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (group) {
            setName(group.name);
        }
    }, [group, open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!group || !name.trim()) return;

        setLoading(true);
        try {
            const success = await editGroup(group.id, { name });
            if (success) {
                onOpenChange(false);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <Form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Rename Project Group</DialogTitle>
                        <DialogDescription>
                            Update the name of the project group.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-group-name" className="text-right">
                                Name
                            </Label>
                            <Input
                                id="edit-group-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="col-span-3"
                                autoFocus
                                required
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading || !name.trim()}>
                            {loading ? 'Saving...' : 'Save Changes'}
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
