'use client';

import { useState, useEffect } from 'react';
import { Project } from '@/types';
import { useProjects } from '@/hooks/useProjects';
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
import { DescriptionEditor } from '@/components/ui/description-editor';

interface EditProjectDialogProps {
    project: Project | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    clientId: string;
}

export function EditProjectDialog({ project, open, onOpenChange, clientId }: EditProjectDialogProps) {
    const { editProject } = useProjects(clientId);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (project) {
            setName(project.name);
            setDescription(project.description || '');
        }
    }, [project, open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!project || !name.trim()) return;

        setLoading(true);
        try {
            const success = await editProject(project.id, {
                name,
                description
            });
            if (success) {
                onOpenChange(false);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px]">
                <Form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Rename Project</DialogTitle>
                        <DialogDescription>
                            Update the name of the project.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-project-name" className="text-right">
                                Name
                            </Label>
                            <Input
                                id="edit-project-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="col-span-3"
                                autoFocus
                                required
                            />
                        </div>
                        {project && (
                            <div className="flex flex-col gap-3">
                                <Label htmlFor="edit-project-description">
                                    Description
                                </Label>
                                <DescriptionEditor
                                    content={description}
                                    onChange={setDescription}
                                    projectId={project.id}
                                    projectName={project.name}
                                    placeholder="Add project overview, goals, etc..."
                                />
                            </div>
                        )}
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
