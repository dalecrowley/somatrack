import { useState, useEffect, useRef } from 'react';
import { Project } from '@/types';
import { useProject } from '@/hooks/useProject';
import { getClient } from '@/lib/services/client';
import { Client } from '@/types';
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Paperclip, Link2, Upload, Layout, X } from 'lucide-react';
import { DescriptionEditor, DescriptionEditorHandle } from '@/components/ui/description-editor';
import { cn } from '@/lib/utils';

interface ProjectInfoDialogProps {
    project: Project;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ProjectInfoDialog({ project, open, onOpenChange }: ProjectInfoDialogProps) {
    const { updateProject } = useProject(project.id);
    const projectId = project.id;
    const projectName = project.name;

    const [resolvedClientName, setResolvedClientName] = useState('');

    // Resolve client name independently for robustness
    useEffect(() => {
        if (project.clientId) {
            getClient(project.clientId).then((c: Client | null) => {
                if (c) setResolvedClientName(c.name);
            });
        }
    }, [project.clientId]);

    const [title, setTitle] = useState(project.name);
    const [description, setDescription] = useState(project.description || '');
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [isEditingDesc, setIsEditingDesc] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [tempTitle, setTempTitle] = useState(project.name);
    const [tempDesc, setTempDesc] = useState(project.description || '');

    const descriptionEditorRef = useRef<DescriptionEditorHandle>(null);

    useEffect(() => {
        if (open) {
            setTitle(project.name);
            setDescription(project.description || '');
            setTempTitle(project.name);
            setTempDesc(project.description || '');
            setIsEditingTitle(false);
            setIsEditingDesc(false);

            if (project.description && project.description.trim() !== "") {
                setIsEditingDesc(true);
            }

            // Sync editor content manually
            descriptionEditorRef.current?.setContent(project.description || '');
        }
    }, [open, project]);

    const handleSaveTitle = async () => {
        if (!tempTitle.trim()) return;
        setTitle(tempTitle);
        setIsEditingTitle(false);
        await updateProject({ name: tempTitle });
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            if (!isEditingDesc) setIsEditingDesc(true);

            // We need to wait for the editor to mount if it wasn't already
            let attempts = 0;
            const tryUpload = () => {
                if (descriptionEditorRef.current?.isReady) {
                    descriptionEditorRef.current.uploadFiles(files);
                } else if (attempts < 10) {
                    attempts++;
                    setTimeout(tryUpload, 100);
                }
            };
            setTimeout(tryUpload, 100);
        }
    };

    const handleSaveDesc = async () => {
        setDescription(tempDesc);
        setIsEditingDesc(false);
        await updateProject({ description: tempDesc });
    };

    const [showUnsavedAlert, setShowUnsavedAlert] = useState(false);
    const hasUnsavedDescription = isEditingDesc && tempDesc !== description;

    const handleClose = () => {
        if (descriptionEditorRef.current?.isUploading) {
            alert("Upload in progress. Please wait until it completes before closing.");
            return;
        }
        if (hasUnsavedDescription) {
            setShowUnsavedAlert(true);
        } else {
            onOpenChange(false);
        }
    };

    return (
        <>
            <Dialog open={open} onOpenChange={(newOpen) => {
                if (!newOpen) {
                    if (descriptionEditorRef.current?.isUploading) {
                        alert("Upload in progress. Please wait until it completes before closing.");
                        return;
                    }
                    if (hasUnsavedDescription) {
                        setShowUnsavedAlert(true);
                        return;
                    }
                }
                onOpenChange(newOpen);
            }}>
                <DialogContent
                    className="md:max-w-[75vw] w-[95vw] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden border-none shadow-2xl transition-all duration-300"
                    showCloseButton={false}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onInteractOutside={(e) => {
                        if (hasUnsavedDescription) {
                            e.preventDefault();
                            setShowUnsavedAlert(true);
                        }
                    }}
                >
                    {isDragging && (
                        <div className="absolute inset-0 bg-primary/10 backdrop-blur-[1px] z-50 flex items-center justify-center border-2 border-primary border-dashed m-4 rounded-xl pointer-events-none">
                            <div className="bg-background/90 px-6 py-4 rounded-lg shadow-lg flex flex-col items-center gap-2">
                                <div className="p-3 bg-primary/10 rounded-full">
                                    <Upload className="h-8 w-8 text-primary" />
                                </div>
                                <p className="font-semibold text-lg text-primary">Drop files to upload</p>
                            </div>
                        </div>
                    )}
                    <VisuallyHidden>
                        <DialogTitle>Project Info: {title}</DialogTitle>
                        <DialogDescription>View and edit project details.</DialogDescription>
                    </VisuallyHidden>

                    {/* Header Banner - Project Info Style */}
                    <div className="h-10 flex items-center justify-center relative bg-zinc-800 transition-colors duration-500">
                        <span className="text-white text-xs font-bold tracking-[0.2em] uppercase">Project Info</span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 text-white/80 hover:text-white hover:bg-white/10 h-7 w-7"
                            onClick={handleClose}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto bg-[#F9FAFB] dark:bg-background">
                        <div className="flex flex-col md:flex-row h-full">
                            {/* Main Content */}
                            <div className="flex-1 p-10 pr-6 space-y-8">
                                {/* Title Section */}
                                <div className="space-y-4">
                                    {isEditingTitle ? (
                                        <div className="space-y-3">
                                            <Input
                                                className="text-2xl font-bold h-auto py-1 px-2 border-primary/30 bg-white focus-visible:ring-2 focus-visible:ring-primary/20"
                                                value={tempTitle}
                                                onChange={(e) => setTempTitle(e.target.value)}
                                                autoFocus
                                                onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                                                onBlur={handleSaveTitle}
                                            />
                                        </div>
                                    ) : (
                                        <h2
                                            className="text-2xl font-bold text-[#4A4A4A] dark:text-foreground cursor-pointer hover:bg-muted/30 px-1 py-0.5 rounded transition-colors flex items-center gap-2"
                                            onClick={() => setIsEditingTitle(true)}
                                        >
                                            <Layout className="h-6 w-6 text-muted-foreground opacity-50" />
                                            {title}
                                        </h2>
                                    )}

                                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                        <span className="opacity-70">
                                            Project created {project.createdAt?.toDate ? new Date(project.createdAt.toDate()).toLocaleDateString() : 'recently'}
                                        </span>
                                    </div>
                                </div>

                                {/* Description Area */}
                                <div className="space-y-4">
                                    <div className="flex-1 space-y-4">
                                        {isEditingDesc ? (
                                            <div className="space-y-3">
                                                <DescriptionEditor
                                                    ref={descriptionEditorRef}
                                                    content={tempDesc}
                                                    onChange={setTempDesc}
                                                    projectId={projectId}
                                                    projectName={tempTitle}
                                                    clientName={resolvedClientName}
                                                    onDropFiles={() => setIsDragging(false)}
                                                />
                                                {tempDesc !== description && (
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            onClick={handleSaveDesc}
                                                            className="bg-blue-600 hover:bg-blue-700 text-white h-8 px-3 text-xs"
                                                        >
                                                            Update description
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            onClick={() => {
                                                                setTempDesc(description);
                                                                setIsEditingDesc(false);
                                                            }}
                                                            className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground"
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div
                                                className={cn(
                                                    "group relative min-h-[40px] transition-all",
                                                    !description && "cursor-pointer"
                                                )}
                                                onClick={() => {
                                                    if (!description) {
                                                        setIsEditingDesc(true);
                                                        setTimeout(() => descriptionEditorRef.current?.focus(), 100);
                                                    }
                                                }}
                                            >
                                                {description ? (
                                                    <div className="space-y-4">
                                                        <div
                                                            className="text-sm text-foreground/80 leading-relaxed cursor-pointer hover:bg-muted/10 p-4 -m-4 rounded transition-colors prose prose-sm max-w-none"
                                                            onClick={() => {
                                                                setIsEditingDesc(true);
                                                                setTimeout(() => descriptionEditorRef.current?.focus(), 100);
                                                            }}
                                                            dangerouslySetInnerHTML={{ __html: description }}
                                                        />
                                                        <Button
                                                            variant="secondary"
                                                            size="sm"
                                                            className="bg-[#EDEDED] text-[#4A4A4A] hover:bg-[#E0E0E0] h-8 px-4 font-normal text-xs transition-transform active:scale-95 mt-4"
                                                            onClick={() => {
                                                                setIsEditingDesc(true);
                                                                setTimeout(() => descriptionEditorRef.current?.focus(), 100);
                                                            }}
                                                        >
                                                            Edit description
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <Button variant="secondary" className="bg-[#EDEDED] text-[#4A4A4A] hover:bg-[#E0E0E0] h-8 px-4 font-normal text-xs transition-transform active:scale-95">
                                                        Add description
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                            </div>

                            {/* Sidebar */}
                            <div className="w-full md:w-[220px] bg-white dark:bg-card border-l p-6 space-y-6">
                                <div className="space-y-6">
                                    <div className="space-y-1.5">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1 mb-2">Actions</p>

                                        <Button
                                            variant="secondary"
                                            className="w-full justify-start h-8 px-2 text-xs font-normal bg-muted/40 hover:bg-muted/80 text-foreground/80 transition-colors"
                                            onClick={() => {
                                                if (!isEditingDesc) setIsEditingDesc(true);

                                                let attempts = 0;
                                                const tryLink = () => {
                                                    if (descriptionEditorRef.current?.isReady) {
                                                        descriptionEditorRef.current.insertLink();
                                                    } else if (attempts < 10) {
                                                        attempts++;
                                                        setTimeout(tryLink, 100);
                                                    }
                                                };
                                                setTimeout(tryLink, 100);
                                            }}
                                        >
                                            <Link2 className="h-3.5 w-3.5 mr-2 opacity-70" />
                                            Link
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <AlertDialog open={showUnsavedAlert} onOpenChange={setShowUnsavedAlert}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
                        <AlertDialogDescription>
                            You have unsaved changes in the description. Do you want to discard them and close?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setShowUnsavedAlert(false)}>Keep Editing</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                setShowUnsavedAlert(false);
                                onOpenChange(false);
                            }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Discard Changes
                        </AlertDialogAction>
                        <AlertDialogAction
                            onClick={async () => {
                                await handleSaveDesc();
                                setShowUnsavedAlert(false);
                                onOpenChange(false);
                            }}
                        >
                            Save and Close
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
