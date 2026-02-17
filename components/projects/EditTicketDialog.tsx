import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { Ticket, Attachment, Comment } from '@/types';
import { useTickets } from '@/hooks/useTickets';
import { useProject } from '@/hooks/useProject';
import { useUsers } from '@/hooks/useUsers';
import { useAuthStore } from '@/lib/store/useAuthStore';
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// import { Textarea } from '@/components/ui/textarea'; // No longer used
import { TicketAttachments, TicketAttachmentsHandle } from './ticket/TicketAttachments';
import { TicketComments } from './ticket/TicketComments';
import { Trash2, X, User, MessageSquare, Paperclip, Check, Link2, Calendar, Archive, Upload } from 'lucide-react';
import { Linkify } from '@/components/ui/linkify';
import { TicketSidebarActions } from './ticket/TicketSidebarActions';
import { DescriptionEditor, DescriptionEditorHandle } from '@/components/ui/description-editor';
import { TicketAssigneePicker } from './ticket/TicketAssigneePicker';
import { Checkbox } from '@/components/ui/checkbox';
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
    open: boolean;
    onOpenChange: (open: boolean) => void;
    color?: string;
}

export function EditTicketDialog({ ticket, projectId, projectName, open, onOpenChange, color: initialColor }: EditTicketDialogProps) {
    const { editTicket, removeTicket, archiveTicket } = useTickets(projectId);
    const { project } = useProject(projectId);
    const { users } = useUsers();
    const currentUser = useAuthStore((state) => state.user);

    const [title, setTitle] = useState(ticket.title);
    const [description, setDescription] = useState(ticket.description);
    const [dueDate, setDueDate] = useState<Date | undefined>(ticket.dueDate ? new Date(ticket.dueDate.seconds * 1000) : undefined);
    const [assigneeIds, setAssigneeIds] = useState<string[]>(ticket.assigneeIds || []);
    const [attachments, setAttachments] = useState<Attachment[]>(ticket.attachments || []);
    const [comments, setComments] = useState<Comment[]>(ticket.comments || []);
    const [currentStatusId, setCurrentStatusId] = useState(ticket.statusId);
    const [bannerColor, setBannerColor] = useState(initialColor);

    // Track if status has changed (pending update)
    const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);

    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [isEditingDesc, setIsEditingDesc] = useState(false);
    const [isDragging, setIsDragging] = useState(false); // New state for drag visual feedback

    // Temp states for editing
    const [tempTitle, setTempTitle] = useState(ticket.title);
    const [tempDesc, setTempDesc] = useState(ticket.description);

    // Dropdown state for sidebar actions
    const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);



    // Hidden file input for sidebar "Files" button
    const fileInputRef = useRef<HTMLInputElement>(null);
    const descriptionEditorRef = useRef<DescriptionEditorHandle>(null);

    // Legacy support: We might still have attachments in the DB, but we're moving to inline.
    // We'll keep the attachments state for now but maybe not display the old list if we fully migrate.
    // For this implementation, we will hide the old "TicketAttachments" component.

    useEffect(() => {
        if (open) {
            setTitle(ticket.title);
            setDescription(ticket.description);
            setTempTitle(ticket.title);
            setTempDesc(ticket.description);
            setAssigneeIds(ticket.assigneeIds || []);
            setAttachments(ticket.attachments || []);
            setComments(ticket.comments || []);
            setCurrentStatusId(ticket.statusId);
            setBannerColor(initialColor);
            setIsEditingTitle(false);
            setIsEditingDesc(false);
            setPendingStatusId(null); // Reset pending status

            // Auto-open description if it exists
            if (ticket.description && ticket.description.trim() !== "") {
                setIsEditingDesc(true);
            }
        }
    }, [open, ticket, initialColor]);

    // Commit pending status change when dialog closes
    useEffect(() => {
        if (!open && pendingStatusId) {
            // Dialog just closed and we have a pending status update
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
        // Update UI immediately but don't save to DB yet
        setCurrentStatusId(statusId);
        if (color) setBannerColor(color);
        setPendingStatusId(statusId); // Mark as pending
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

    // Drag and Drop Handlers
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        // Check if we're actually leaving the container, not just entering a child
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0 && descriptionEditorRef.current) {
            // Ensure we are in edit mode
            if (!isEditingDesc) setIsEditingDesc(true);
            // Wait for render
            setTimeout(() => {
                descriptionEditorRef.current?.uploadFiles(files);
            }, 100);
        }
    };

    // Auto-save description with debounce
    useEffect(() => {
        if (!isEditingDesc || tempDesc === description) return;

        const timer = setTimeout(async () => {
            setDescription(tempDesc);
            await editTicket(ticket.id, { description: tempDesc });
        }, 1000); // 1s debounce

        return () => clearTimeout(timer);
    }, [tempDesc, isEditingDesc]);

    const statuses = project?.statuses || [];
    const statusLabel = statuses.find(s => s.id === currentStatusId)?.title?.toUpperCase() || currentStatusId?.toUpperCase().replace(/_/g, ' ') || 'TODO';
    const assignedUsers = users.filter(u => assigneeIds.includes(u.uid));

    // Find creator for the "Posted by" section
    const creatorUser = users.find(u => u.uid === ticket.createdBy || u.email === ticket.createdBy);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="md:max-w-[75vw] w-[95vw] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden border-none shadow-2xl transition-all duration-300"
                showCloseButton={false}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
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
                {/* Status Banner */}
                <div
                    className="h-10 flex items-center justify-center relative transition-colors duration-500"
                    style={{ backgroundColor: bannerColor || '#7FB3B3' }}
                >
                    <span className="text-white text-xs font-bold tracking-[0.2em]">{statusLabel}</span>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 text-white/80 hover:text-white hover:bg-white/10 h-7 w-7"
                        onClick={() => onOpenChange(false)}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto bg-[#F9FAFB] dark:bg-background">
                    <div className="flex flex-col md:flex-row h-full">
                        {/* Main Content */}
                        <div className="flex-1 p-10 pr-6 space-y-8">
                            {/* Header / Title Section */}
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
                                        className="text-2xl font-bold text-[#4A4A4A] dark:text-foreground cursor-pointer hover:bg-muted/30 px-1 py-0.5 rounded transition-colors"
                                        onClick={() => setIsEditingTitle(true)}
                                    >
                                        {title}
                                    </h2>
                                )}

                                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                    <span className="flex items-center gap-1 opacity-70">
                                        Posted by <span className="font-semibold underline cursor-pointer">Dale Crowley</span> just now.
                                    </span>
                                    <span className="opacity-40">•</span>
                                    <span>In swimlane <span className="font-semibold underline cursor-pointer">{ticket.swimlaneId}</span>, in list <span className="font-semibold underline cursor-pointer">{statusLabel}</span></span>
                                    {assignedUsers.length > 0 && (
                                        <>
                                            <span className="opacity-40">•</span>
                                            <span className="flex items-center gap-1">
                                                Assigned to <span className="font-semibold">{assignedUsers.map(u => u.displayName || u.email).join(', ')}</span>
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Description Area */}
                            <div className="space-y-4">
                                <div className="flex items-start gap-4">
                                    <div className="h-8 w-8 rounded-full overflow-hidden flex-shrink-0 border bg-muted mt-1">
                                        {currentUser?.photoURL ? (
                                            <Avatar className="h-full w-full">
                                                <AvatarImage src={currentUser.photoURL} />
                                                <AvatarFallback>{currentUser.displayName?.[0]}</AvatarFallback>
                                            </Avatar>
                                        ) : (
                                            <User className="h-full w-full p-1.5 opacity-40" />
                                        )}
                                    </div>

                                    <div className="flex-1 space-y-4">
                                        {isEditingDesc ? (
                                            <div className="space-y-3">
                                                <DescriptionEditor
                                                    ref={descriptionEditorRef}
                                                    content={tempDesc}
                                                    onChange={setTempDesc}
                                                    projectId={projectId}
                                                    ticketId={ticket.id}
                                                    projectName={projectName}
                                                />
                                            </div>
                                        ) : (
                                            <div
                                                className={cn(
                                                    "group relative min-h-[40px] transition-all",
                                                    !description && "cursor-pointer"
                                                )}
                                                onClick={() => !description && setIsEditingDesc(true)}
                                            >
                                                {description ? (
                                                    <div className="space-y-4">
                                                        <div
                                                            className="text-sm text-foreground/80 leading-relaxed cursor-pointer hover:bg-muted/10 p-2 -m-2 rounded transition-colors prose prose-sm max-w-none"
                                                            onClick={() => setIsEditingDesc(true)}
                                                            dangerouslySetInnerHTML={{ __html: description }}
                                                        />
                                                        <Button
                                                            variant="secondary"
                                                            size="sm"
                                                            className="bg-[#EDEDED] text-[#4A4A4A] hover:bg-[#E0E0E0] h-8 px-4 font-normal text-xs transition-transform active:scale-95"
                                                            onClick={() => setIsEditingDesc(true)}
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

                            {/* Attachments Section REMOVED - integrated into editor */}
                            {/* Hidden file input for sidebar triggers */}
                            <input
                                type="file"
                                className="hidden"
                                ref={fileInputRef}
                                multiple
                                onChange={(e) => {
                                    if (e.target.files && descriptionEditorRef.current) {
                                        // Ensure we are in edit mode to insert
                                        if (!isEditingDesc) setIsEditingDesc(true);
                                        // Small timeout to allow render
                                        setTimeout(() => {
                                            descriptionEditorRef.current?.uploadFiles(Array.from(e.target.files!));
                                        }, 100);
                                    }
                                    e.target.value = ''; // Reset
                                }}
                            />

                            {/* Discussion Area */}
                            <div className="pt-8 border-t space-y-4">
                                <div className="flex items-center gap-3 text-sm font-semibold text-[#4A4A4A] dark:text-foreground">
                                    <MessageSquare className="h-4 w-4" />
                                    Discussion / Add Comments
                                </div>
                                <TicketComments
                                    comments={comments}
                                    onChange={(newComments) => {
                                        setComments(newComments);
                                        editTicket(ticket.id, { comments: newComments });
                                    }}
                                />
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div className="w-full md:w-[220px] bg-white dark:bg-card border-l p-6 space-y-6">
                            <div className="space-y-6">
                                <div className="space-y-1.5">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1 mb-2">Actions</p>

                                    {/* Status Popover */}
                                    <Popover modal={false} open={statusDropdownOpen} onOpenChange={setStatusDropdownOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="secondary"
                                                className="w-full justify-start h-8 px-2 text-xs font-normal bg-muted/40 hover:bg-muted/80 text-foreground/80 transition-colors"
                                            >
                                                <Check className="h-3.5 w-3.5 mr-2 opacity-70" />
                                                Status
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[200px] p-2" align="start">
                                            <div className="space-y-1">
                                                <p className="text-xs font-semibold px-2 py-1">Change Status</p>
                                                {statuses.map((s) => (
                                                    <Button
                                                        key={s.id}
                                                        variant="ghost"
                                                        className="w-full justify-start h-8 px-2 text-xs"
                                                        onClick={() => {
                                                            handleStatusUpdate(s.id, s.color);
                                                            setStatusDropdownOpen(false);
                                                        }}
                                                    >
                                                        <div className="flex items-center gap-2 flex-1">
                                                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                                                            <span>{s.title}</span>
                                                        </div>
                                                        {currentStatusId === s.id && <Check className="h-3 w-3" />}
                                                    </Button>
                                                ))}
                                            </div>
                                        </PopoverContent>
                                    </Popover>

                                    {/* Assign Popover */}
                                    <TicketAssigneePicker
                                        value={assigneeIds}
                                        onValueChange={async (newIds) => {
                                            setAssigneeIds(newIds);
                                            await editTicket(ticket.id, { assigneeIds: newIds });
                                        }}
                                    />

                                    <Button
                                        variant="secondary"
                                        className="w-full justify-start h-8 px-2 text-xs font-normal bg-muted/40 hover:bg-muted/80 text-foreground/80 transition-colors"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <Paperclip className="h-3.5 w-3.5 mr-2 opacity-70" />
                                        Files
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        className="w-full justify-start h-8 px-2 text-xs font-normal bg-muted/40 hover:bg-muted/80 text-foreground/80 transition-colors"
                                        onClick={() => {
                                            if (!isEditingDesc) setIsEditingDesc(true);
                                            setTimeout(() => descriptionEditorRef.current?.insertLink(), 100);
                                        }}
                                    >
                                        <Link2 className="h-3.5 w-3.5 mr-2 opacity-70" />
                                        Link
                                    </Button>
                                    <Popover modal={false}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="secondary"
                                                className={cn(
                                                    "w-full justify-start h-8 px-2 text-xs font-normal transition-colors",
                                                    dueDate ? "bg-primary/10 text-primary hover:bg-primary/20" : "bg-muted/40 hover:bg-muted/80 text-foreground/80"
                                                )}
                                            >
                                                <Calendar className={cn("h-3.5 w-3.5 mr-2", dueDate ? "opacity-100" : "opacity-70")} />
                                                {dueDate ? format(dueDate, "PPP") : "Due date"}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <CalendarComponent
                                                mode="single"
                                                selected={dueDate}
                                                onSelect={handleDateSelect}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                <div className="space-y-1.5 pt-4">
                                    <Button
                                        variant="secondary"
                                        className="w-full justify-start h-8 px-2 text-xs font-normal bg-muted/40 hover:bg-muted/80 transition-colors"
                                        onClick={handleArchive}
                                    >
                                        <Archive className="h-3.5 w-3.5 mr-2 opacity-70" />
                                        Archive
                                    </Button>
                                </div>
                            </div>

                            <div className="pt-6 border-t mt-auto">
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="sm" className="w-full justify-start text-[10px] text-destructive hover:bg-destructive/10 hover:text-destructive h-7">
                                            <Trash2 className="h-3 w-3 mr-2" />
                                            Remove Ticket
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Delete Ticket?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action cannot be undone.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                                Delete
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                                <p className="text-[9px] text-muted-foreground mt-4 px-1">
                                    Updated: {ticket.updatedAt ? new Date(ticket.updatedAt.toDate()).toLocaleDateString() : 'Today'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
