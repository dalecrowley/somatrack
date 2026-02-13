import { Button } from '@/components/ui/button';
import {
    Flag,
    Palette,
    Tag,
    Paperclip,
    UserPlus,
    Link2,
    Calendar,
    Clock,
    BarChart2,
    Eye,
    Database,
    Archive,
    MoreHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarActionProps {
    icon: React.ElementType;
    label: string;
    onClick?: () => void;
    className?: string;
}

function SidebarAction({ icon: Icon, label, onClick, className }: SidebarActionProps) {
    return (
        <Button
            variant="secondary"
            className={cn(
                "w-full justify-start h-8 px-2 text-xs font-normal bg-muted/40 hover:bg-muted/80 text-foreground/80 transition-colors",
                className
            )}
            onClick={onClick}
        >
            <Icon className="h-3.5 w-3.5 mr-2 opacity-70" />
            {label}
        </Button>
    );
}

interface TicketSidebarActionsProps {
    onStatusClick?: () => void;
    onAssignClick?: () => void;
    onFilesClick?: () => void;
    onLinkClick?: () => void;
    onDueDateClick?: () => void;
    onArchiveClick?: () => void;
}

export function TicketSidebarActions({
    onStatusClick,
    onAssignClick,
    onFilesClick,
    onLinkClick,
    onDueDateClick,
    onArchiveClick
}: TicketSidebarActionsProps) {
    return (
        <div className="space-y-6">
            <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1 mb-2">Actions</p>
                <SidebarAction icon={Flag} label="Status" onClick={onStatusClick} />
                <SidebarAction icon={UserPlus} label="Assign" onClick={onAssignClick} />
                <SidebarAction icon={Paperclip} label="Files" onClick={onFilesClick} />
                <SidebarAction icon={Link2} label="Link" onClick={onLinkClick} />
                <SidebarAction icon={Calendar} label="Due date" onClick={onDueDateClick} />
            </div>

            <div className="space-y-1.5 pt-4">
                <SidebarAction icon={Archive} label="Archive" className="hover:bg-destructive/10 hover:text-destructive" onClick={onArchiveClick} />
            </div>
        </div>
    );
}
