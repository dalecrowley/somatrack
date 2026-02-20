'use client';

import { useState, useEffect } from 'react';
import { Project } from '@/types';
import { useProjects } from '@/hooks/useProjects';
import { getClient } from '@/lib/services/client';
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
import { DescriptionEditor, DescriptionEditorHandle } from '@/components/ui/description-editor';
import { Checkbox } from '@/components/ui/checkbox';
import { useRef } from 'react';
import { ImagePlus, X, Loader2 } from 'lucide-react';

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
    const [error, setError] = useState<string | null>(null);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [useDarkBackground, setUseDarkBackground] = useState(false);
    const [clientName, setClientName] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (project) {
            setName(project.name);
            setDescription(project.description || '');
            setLogoPreview(project.logoUrl || null);
            setUseDarkBackground(project.logoUseDarkBackground || false);
            setLogoFile(null);
            setError(null);

            // Fetch client name
            if (clientId) {
                getClient(clientId).then(client => {
                    if (client) setClientName(client.name);
                });
            }

            // Sync editor content manually
            descriptionEditorRef.current?.setContent(project.description || '');
        }
    }, [project, open, clientId]);

    const descriptionEditorRef = useRef<DescriptionEditorHandle>(null);

    const handleClose = (newOpen: boolean) => {
        if (!newOpen) {
            if (descriptionEditorRef.current?.isUploading) {
                alert("Upload in progress. Please wait until it completes before closing.");
                return;
            }
        }
        onOpenChange(newOpen);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!project || !name.trim()) return;

        setLoading(true);
        setError(null);
        try {
            let logoUrl = project.logoUrl || '';

            // Upload logo to Box if a NEW file is selected
            if (logoFile) {
                // 1. Get routing folder for images
                const folderRes = await fetch('/api/box/folder', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        fileName: logoFile.name,
                        mimeType: logoFile.type,
                        projectId: project.id,
                        projectName: name,
                        clientName: clientName
                    })
                });
                const { folderId } = await folderRes.json();

                // 2. Upload the file with a unique name to avoid collisions in the shared image folder
                const ext = logoFile.name.split('.').pop();
                const uniqueName = `logo_${Date.now()}.${ext}`;
                const renamedFile = new File([logoFile], uniqueName, { type: logoFile.type });
                const formData = new FormData();
                formData.append('file', renamedFile);
                formData.append('folderId', folderId || '0');

                const uploadRes = await fetch('/api/box/upload', {
                    method: 'POST',
                    body: formData
                });

                if (!uploadRes.ok) {
                    const errBody = await uploadRes.json().catch(() => ({}));
                    throw new Error(errBody.details || errBody.error || 'Box upload failed');
                }

                const { id } = await uploadRes.json();
                // Store the proxy URL as the logoUrl
                logoUrl = `/api/box/content/${id}`;
            } else if (!logoPreview) {
                // Logo was explicitly removed
                logoUrl = '';
            }

            const success = await editProject(project.id, {
                name,
                description,
                logoUrl,
                logoUseDarkBackground: useDarkBackground
            });
            if (success) {
                onOpenChange(false);
            }
        } catch (err: any) {
            console.error('Failed to update project with logo:', err);
            setError(err.message || 'Failed to save. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setLogoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveLogo = () => {
        setLogoFile(null);
        setLogoPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[700px]">
                <Form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Rename Project</DialogTitle>
                        <DialogDescription>
                            Update the name of the project.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-6 py-6">
                        <div className="flex flex-col items-center gap-4">
                            <Label htmlFor="edit-project-logo-upload" className="text-sm font-medium cursor-pointer hover:text-primary transition-colors">
                                Project Logo
                            </Label>
                            <div className="relative group">
                                <div
                                    className={`h-24 w-24 rounded-xl border-2 border-dashed border-muted-foreground/20 flex items-center justify-center cursor-pointer overflow-hidden hover:border-primary/50 transition-all ${useDarkBackground ? 'bg-zinc-900 border-zinc-800' : 'bg-muted/30'
                                        }`}
                                    onClick={() => fileInputRef.current?.click()}
                                    role="button"
                                    aria-label="Upload project logo"
                                >
                                    {logoPreview ? (
                                        <img
                                            src={logoPreview}
                                            alt="Logo preview"
                                            className="h-full w-full object-contain p-2"
                                        />
                                    ) : (
                                        <div className={`flex flex-col items-center gap-1 ${useDarkBackground ? 'text-zinc-500' : 'text-muted-foreground'}`}>
                                            <ImagePlus className="h-6 w-6" />
                                            <span className="text-[10px]">Upload</span>
                                        </div>
                                    )}
                                </div>
                                {logoPreview && (
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="icon"
                                        className="h-6 w-6 rounded-full absolute -top-2 -right-2 shadow-sm"
                                        onClick={handleRemoveLogo}
                                        aria-label="Remove logo"
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                )}
                            </div>
                            <input
                                id="edit-project-logo-upload"
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleFileChange}
                            />
                            <div className="flex items-center space-x-2 pt-2">
                                <Checkbox
                                    id="edit-proj-dark-bg"
                                    checked={useDarkBackground}
                                    onCheckedChange={(checked) => setUseDarkBackground(checked as boolean)}
                                />
                                <Label
                                    htmlFor="edit-proj-dark-bg"
                                    className="text-xs font-normal text-muted-foreground cursor-pointer"
                                >
                                    Use dark background for logo
                                </Label>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-project-name">Project Name</Label>
                            <Input
                                id="edit-project-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
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
                                    ref={descriptionEditorRef}
                                    content={description}
                                    onChange={setDescription}
                                    projectId={project.id}
                                    projectName={name}
                                    clientName={clientName}
                                    placeholder="Add project overview, goals, etc..."
                                />
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        {error && (
                            <p className="text-sm text-destructive w-full text-center mb-2">{error}</p>
                        )}
                        <Button type="submit" disabled={loading || !name.trim()} className="w-full">
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : 'Save Changes'}
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
