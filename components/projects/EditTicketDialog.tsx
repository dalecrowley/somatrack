import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { Ticket, Attachment, Comment, TimeEntry } from '@/types';
import { useTickets } from '@/hooks/useTickets';
import { useProject } from '@/hooks/useProject';
import { useUsers } from '@/hooks/useUsers';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { getClient } from '@/lib/services/client';
import { Client } from '@/types';
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TicketComments } from './ticket/TicketComments';
import { TicketTimeTracking } from './ticket/TicketTimeTracking';
import { Trash2, X, Check, Archive, Upload } from 'lucide-react';
import { DescriptionEditor, DescriptionEditorHandle } from '@/components/ui/description-editor';
import { TicketAssigneePicker } from './ticket/TicketAssigneePicker';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

interface EditTicketDialogProps {
    ticket: Ticket;
    projectId: string;
    projectName?: string;
    clientName?: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    color?: string;
}

export function EditTicketDialog({ ticket, projectId, projectName, clientName, open, onOpenChange, color: initialColor }: EditTicketDialogProps) {
    const { editTicket, removeTicket, archiveTicket } = useTickets(projectId);
    const { project } = useProject(projectId);
    const { users } = useUsers();
    const currentUser = useAuthStore((state) => state.user);

    const [resolvedProjectName, setResolvedProjectName] = useState(projectName || '');
    const [resolvedClientName, setResolvedClientName] = useState(clientName || '');

    useEffect(() => {
        if (project) {
            if (!resolvedProjectName) setResolvedProjectName(project.name);

            if (!resolvedClientName && project.clientId) {
                getClient(project.clientId).then((c: Client | null) => {
                    if (c) setResolvedClientName(c.name);
                });
            }
        }
    }, [project, resolvedProjectName, resolvedClientName]);

    const [title, setTitle] = useState(ticket.title);
    const [description, setDescription] = useState(ticket.description);
    const [dueDate, setDueDate] = useState<Date | undefined>(ticket.dueDate ? new Date(ticket.dueDate.seconds * 1000) : undefined);
    const [assigneeIds, setAssigneeIds] = useState<string[]>(ticket.assigneeIds || []);
    const [comments, setComments] = useState<Comment[]>(ticket.comments || []);
    const [timeEntries, setTimeEntries] = useState<TimeEntry[]>(ticket.timeEntries || []);
    const [currentStatusId, setCurrentStatusId] = useState(ticket.statusId);
    const [bannerColor, setBannerColor] = useState(initialColor);
    const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);

    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [isEditingDesc, setIsEditingDesc] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const [tempTitle, setTempTitle] = useState(ticket.title);
    const [tempDesc, setTempDesc] = useState(ticket.description);

    const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
    const descriptionEditorRef = useRef<DescriptionEditorHandle>(null);

    useEffect(() => {
        if (open) {
            setTitle(ticket.title);
            setDescription(ticket.description);
            setTempTitle(ticket.title);
            setTempDesc(ticket.description);
            setAssigneeIds(ticket.assigneeIds || []);
            setComments(ticket.comments || []);
            setTimeEntries(ticket.timeEntries || []);
            setCurrentStatusId(ticket.statusId);
            setBannerColor(initialColor);
            setIsEditingTitle(false);
            setIsEditingDesc(false);
            setPendingStatusId(null);

            if (ticket.description && ticket.description.trim() !== "") {
                setIsEditingDesc(true);
            }

            descriptionEditorRef.current?.setContent(ticket.description || '');
        }
    }, [open, ticket, initialColor]);

    useEffect(() => {
        if (!open && pendingStatusId) {
            editTicket(ticket.id, { statusId: pendingStatusId });
            setPendingStatusId(null);
        }
    }, [open, pendingStatusId]);

    const handleSaveTitle = async () => {
        if (!tempTitle.trim()) return;
        setTitle(tempTitle);
        setIsEditingTitle(false);
        await editTicket(ticket.id, { title: tempTitle });
    };

    const handleSaveDesc = async () => {
        setDescription(tempDesc);
        setIsEditingDesc(false);
        await editTicket(ticket.id, { description: tempDesc });
    };

    const handleStatusUpdate = (statusId: string, color?: string) => {
        setCurrentStatusId(statusId);
        if (color) setBannerColor(color);
        setPendingStatusId(statusId);
    };

    const handleDateSelect = async (date: Date | undefined) => {
        setDueDate(date);
        await editTicket(ticket.id, { dueDate: date });
    };

    const handleArchive = async () => {
        try {
            await archiveTicket(ticket.id);
            onOpenChange(false);
        } catch (error) {
            console.error('Failed to archive ticket', error);
        }
    };

    const handleDelete = async () => {
        try {
            await removeTicket(ticket.id);
            onOpenChange(false);
        } catch (error) {
            console.error('Failed to delete ticket', error);
        }
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

    const statuses = project?.statuses || [];
    const statusLabel = statuses.find(s => s.id === currentStatusId)?.title?.toUpperCase() || currentStatusId?.toUpperCase().replace(/_/g, ' ') || 'TODO';

    const [showUnsavedAlert, setShowUnsavedAlert] = useState(false);
    const hasUnsavedDescription = isEditingDesc && tempDesc !== description;

    const handleClose = () => {
        const isUploading = descriptionEditorRef.current?.isUploading;
        if (isUploading) {
            alert("Upload in progress. Please wait until it completes before closing.");
            return;
        }

        if (hasUnsavedDescription) {
            setShowUnsavedAlert(true);
        } else {
            onOpenChange(false);
        }
    };

    // User details logic
    const displayedUsers = users.filter(u => assigneeIds.includes(u.uid));

    return (
        <>
            <Dialog open={open} onOpenChange={(newOpen) => {
                if (!newOpen && hasUnsavedDescription) {
                    setShowUnsavedAlert(true);
                    return;
                }
                onOpenChange(newOpen);
            }}>
                <DialogContent
                    className="md:max-w-[85vw] w-[95vw] h-[95vh] flex flex-col p-0 gap-0 overflow-hidden border-none shadow-2xl transition-all duration-300 bg-surface dark:bg-slate-900 font-['Inter']"
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
                        <DialogTitle>Edit Ticket: {title}</DialogTitle>
                        <DialogDescription>View and edit ticket details, attachments, and discussion.</DialogDescription>
                    </VisuallyHidden>

                    {/* Task View Header / Hero Section */}
                    <div className="flex-1 overflow-y-auto">
                        {/* Status banner alternative: Top strip or pill. Since this is Atrium, we remove the massive heavy color banner and put it inline */}
                        <div className="flex justify-end p-4 absolute top-0 right-0 z-10 w-full pointer-events-none">
                            <div className="flex gap-2 pointer-events-auto shadow-lg rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1">
                                <button className="material-symbols-outlined p-2 text-on-surface-variant hover:bg-surface-container-high rounded-full transition-colors flex items-center justify-center">share</button>
                                <button className="material-symbols-outlined p-2 text-on-surface-variant hover:bg-surface-container-high rounded-full transition-colors flex items-center justify-center">more_horiz</button>
                                <button onClick={handleClose} className="material-symbols-outlined p-2 text-error hover:bg-error-container rounded-full transition-colors flex items-center justify-center">close</button>
                            </div>
                        </div>

                        <section className="px-12 pt-16 pb-8 flex flex-col gap-6">
                            <div className="flex justify-between items-start">
                                <div className="flex flex-col gap-2 relative w-full pr-32">
                                    <div className="flex items-center gap-3 text-secondary dark:text-blue-400 font-semibold text-xs tracking-widest uppercase mb-1">
                                        <span>{resolvedClientName || 'Workspace'}</span>
                                        <span className="material-symbols-outlined text-[10px]">chevron_right</span>
                                        <span>{resolvedProjectName || 'Project'}</span>
                                        {ticket.swimlaneId && (
                                            <>
                                                <span className="material-symbols-outlined text-[10px]">chevron_right</span>
                                                <span>{ticket.swimlaneId}</span>
                                            </>
                                        )}
                                    </div>
                                    {isEditingTitle ? (
                                        <Input
                                            className="text-4xl font-extrabold text-primary dark:text-blue-400 tracking-tight max-w-3xl leading-tight h-auto py-1 px-2 border-primary/30"
                                            value={tempTitle}
                                            onChange={(e) => setTempTitle(e.target.value)}
                                            autoFocus
                                            onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                                            onBlur={handleSaveTitle}
                                        />
                                    ) : (
                                        <h1 
                                            className="text-4xl font-extrabold text-primary dark:text-white tracking-tight max-w-3xl leading-tight cursor-pointer hover:underline decoration-primary/30"
                                            onClick={() => setIsEditingTitle(true)}
                                        >
                                            {title}
                                        </h1>
                                    )}
                                </div>
                            </div>

                            {/* Meta Strip */}
                            <div className="flex flex-wrap items-center gap-10 py-6 border-b border-outline-variant/20 dark:border-slate-800">
                                <div className="flex flex-col gap-1.5">
                                    <span className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Status</span>
                                    <Popover modal={false} open={statusDropdownOpen} onOpenChange={setStatusDropdownOpen}>
                                        <PopoverTrigger asChild>
                                            <div className="flex items-center gap-2 bg-secondary/10 dark:bg-blue-900/40 text-secondary dark:text-blue-300 px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer hover:bg-secondary/20 transition-colors shadow-sm border border-secondary/10">
                                                <span className="w-2.5 h-2.5 rounded-full shadow-inner" style={{ backgroundColor: bannerColor || 'blue' }}></span>
                                                {statusLabel}
                                            </div>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[200px] p-2" align="start">
                                            <div className="space-y-1">
                                                <p className="text-xs font-semibold px-2 py-1">Change Status</p>
                                                {statuses.map((s) => (
                                                    <Button key={s.id} variant="ghost" className="w-full justify-start h-8 px-2 text-xs font-semibold" onClick={() => { handleStatusUpdate(s.id, s.color); setStatusDropdownOpen(false); }}>
                                                        <div className="flex items-center gap-2 flex-1">
                                                            <div className="h-2 w-2 rounded-full shadow-inner" style={{ backgroundColor: s.color }} />
                                                            <span>{s.title}</span>
                                                        </div>
                                                        {currentStatusId === s.id && <Check className="h-3 w-3" />}
                                                    </Button>
                                                ))}
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <span className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Assignees</span>
                                    <div className="flex -space-x-2">
                                        <TicketAssigneePicker 
                                            value={assigneeIds} 
                                            onValueChange={async (newIds) => { 
                                                setAssigneeIds(newIds); 
                                                await editTicket(ticket.id, { assigneeIds: newIds }); 
                                            }} 
                                        />
                                        {/* Avatar overlap visual purely handled by the picker internally, but we can display the current ones cleanly alongside if needed */}
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <span className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Deadline</span>
                                    <Popover modal={false}>
                                        <PopoverTrigger asChild>
                                            <div className="flex items-center gap-2 text-on-surface font-medium text-sm cursor-pointer hover:text-primary transition-colors py-1">
                                                <span className="material-symbols-outlined text-lg opacity-80">calendar_today</span>
                                                {dueDate ? format(dueDate, "MMMM d, yyyy") : "Set date"}
                                            </div>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <CalendarComponent mode="single" selected={dueDate} onSelect={handleDateSelect} initialFocus />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>
                        </section>

                        <div className="px-12 grid grid-cols-12 gap-12 pb-24">
                            <div className="col-span-12 lg:col-span-8 flex flex-col gap-12">
                                {/* Description Section */}
                                <section className="flex flex-col gap-4">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-xl font-bold text-primary dark:text-white flex items-center gap-2">
                                            <span className="material-symbols-outlined">description</span>
                                            Detailed Description
                                        </h3>
                                    </div>
                                    
                                    <div className="bg-surface-container-lowest dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 leading-relaxed text-on-surface-variant space-y-4">
                                        {isEditingDesc ? (
                                            <div className="space-y-4">
                                                <DescriptionEditor
                                                    ref={descriptionEditorRef}
                                                    content={tempDesc}
                                                    onChange={setTempDesc}
                                                    projectId={projectId}
                                                    ticketId={ticket.id}
                                                    projectName={resolvedProjectName}
                                                    clientName={resolvedClientName}
                                                    onDropFiles={() => setIsDragging(false)}
                                                />
                                                {tempDesc !== description && (
                                                    <div className="flex items-center gap-2 pt-2">
                                                        <Button onClick={handleSaveDesc} className="bg-primary text-white hover:bg-primary/90 rounded-lg text-sm font-bold shadow-lg shadow-primary/20">
                                                            Save Description
                                                        </Button>
                                                        <Button variant="ghost" onClick={() => { setTempDesc(description); setIsEditingDesc(false); }} className="text-slate-500 font-bold hover:bg-slate-100 text-sm">
                                                            Cancel
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="group relative transition-all">
                                                {description ? (
                                                    <div className="space-y-6">
                                                        <div 
                                                            className="text-base text-slate-800 dark:text-slate-200 leading-relaxed cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 p-4 -m-4 rounded-xl transition-colors min-h-[100px] prose prose-sm dark:prose-invert max-w-none"
                                                            onClick={() => { setIsEditingDesc(true); setTimeout(() => descriptionEditorRef.current?.focus(), 100); }}
                                                            dangerouslySetInnerHTML={{ __html: description }}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div onClick={() => { setIsEditingDesc(true); setTimeout(() => descriptionEditorRef.current?.focus(), 100); }} className="w-full py-12 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-400 text-sm font-medium hover:bg-white hover:border-primary hover:text-primary transition-all flex flex-col items-center justify-center gap-3 cursor-pointer">
                                                        <span className="material-symbols-outlined text-3xl">edit_document</span>
                                                        <span>Add a detailed description...</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </section>

                                {/* Time Tracking */}
                                <section className="pt-8 border-t border-outline-variant/10 dark:border-slate-800">
                                    <TicketTimeTracking
                                        ticketId={ticket.id}
                                        projectId={projectId}
                                        projectName={resolvedProjectName}
                                        timeEntries={timeEntries}
                                        onSave={(updated) => {
                                            setTimeEntries(updated);
                                            editTicket(ticket.id, { timeEntries: updated });
                                        }}
                                    />
                                </section>

                                {/* Discussion */}
                                <section className="flex flex-col gap-6 pt-8 border-t border-outline-variant/10 dark:border-slate-800">
                                    <h3 className="text-xl font-bold text-primary dark:text-white flex items-center gap-2">
                                        <span className="material-symbols-outlined">forum</span>
                                        Discussion
                                    </h3>
                                    <TicketComments
                                        comments={comments}
                                        onChange={(newComments) => {
                                            setComments(newComments);
                                            editTicket(ticket.id, { comments: newComments });
                                        }}
                                    />
                                </section>
                            </div>
                            
                            {/* Analytics & Actions Sidebar */}
                            <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
                                <div className="bg-surface-container-low/50 dark:bg-slate-800 rounded-3xl p-6 flex flex-col gap-6 border border-primary/5 shadow-sm">
                                    <h4 className="text-sm font-bold text-primary dark:text-blue-400 uppercase tracking-widest flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[16px]">psychology</span>
                                        Task Data
                                    </h4>
                                    
                                    <div className="flex flex-col gap-4 border-t border-outline-variant/10 dark:border-slate-700 pt-4">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-on-surface-variant font-medium">Created By</span>
                                            <span className="font-bold text-slate-900 dark:text-white">{users.find(u => u.uid === ticket.createdBy || u.email === ticket.createdBy)?.displayName || 'System'}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-on-surface-variant font-medium">Added</span>
                                            <span className="font-bold text-slate-900 dark:text-white">{ticket.createdAt && ticket.createdAt.seconds ? format(new Date(ticket.createdAt.seconds * 1000), "MMM d, yyyy") : 'Unknown'}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-on-surface-variant font-medium">Updated</span>
                                            <span className="font-bold text-slate-900 dark:text-white">{ticket.updatedAt && ticket.updatedAt.seconds ? format(new Date(ticket.updatedAt.seconds * 1000), "MMM d, p") : 'Unknown'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions Card */}
                                <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col gap-3">
                                    <h4 className="text-sm font-bold text-primary dark:text-white mb-2 ml-1">Danger Zone</h4>
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start h-10 px-4 font-bold text-slate-600 hover:text-slate-900 active:scale-[0.98] transition-all rounded-xl border-slate-200 dark:border-slate-700"
                                        onClick={handleArchive}
                                    >
                                        <Archive className="h-4 w-4 mr-3 opacity-70" />
                                        Archive Ticket
                                    </Button>

                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="outline" className="w-full justify-start text-error hover:text-white hover:bg-error h-10 px-4 font-bold active:scale-[0.98] transition-all rounded-xl border-red-200 dark:border-red-900/50 hover:border-error">
                                                <Trash2 className="h-4 w-4 mr-3 opacity-90" />
                                                Delete Permanently
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Delete Ticket?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This action cannot be undone. All files, descriptions, and discussion comments will be lost permanently.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel className="font-bold rounded-xl">Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={handleDelete} className="bg-error text-white hover:bg-error/90 font-bold rounded-xl shadow-lg shadow-error/20">
                                                    Yes, Delete Ticket
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
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
                            className="bg-error text-white hover:bg-error/90"
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
