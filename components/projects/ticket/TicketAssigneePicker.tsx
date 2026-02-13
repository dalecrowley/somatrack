'use client';

import { useState, useEffect } from 'react';
import { useUsers } from '@/hooks/useUsers';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Check } from 'lucide-react';

interface TicketAssigneePickerProps {
    value: string[]; // Multi-assign IDs
    onValueChange: (value: string[]) => void;
    disabled?: boolean;
}

export function TicketAssigneePicker({ value = [], onValueChange, disabled }: TicketAssigneePickerProps) {
    const { users, loading } = useUsers();
    const [open, setOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>(value);

    // Sync internal state when external value changes (e.g. on dialog open)
    useEffect(() => {
        setSelectedIds(value || []);
    }, [value]);

    if (loading) return <div className="h-8 w-full animate-pulse bg-muted/40 rounded-md" />;

    const toggleAssignee = (uid: string) => {
        const newIds = selectedIds.includes(uid)
            ? selectedIds.filter(id => id !== uid)
            : [...selectedIds, uid];

        setSelectedIds(newIds);
        onValueChange(newIds);
    };

    const assignedUsers = users.filter(u => selectedIds.includes(u.uid));

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="secondary"
                    className="w-full justify-start h-8 px-2 text-xs font-normal bg-muted/40 hover:bg-muted/80 text-foreground/80 transition-colors"
                    disabled={disabled}
                >
                    <User className="h-3.5 w-3.5 mr-2 opacity-70" />
                    <span className="truncate">
                        Assign {assignedUsers.length > 0 ? `(${assignedUsers.length})` : ''}
                    </span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[250px] p-3" align="start">
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold">Assign To</p>
                    </div>
                    <div className="max-h-[200px] overflow-y-auto space-y-1">
                        {users.map((user) => (
                            <label
                                key={user.uid}
                                className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer"
                            >
                                <Checkbox
                                    checked={selectedIds.includes(user.uid)}
                                    onCheckedChange={() => toggleAssignee(user.uid)}
                                />
                                <Avatar className="h-5 w-5">
                                    <AvatarImage src={user.photoURL || undefined} />
                                    <AvatarFallback>{user.displayName?.[0] || '?'}</AvatarFallback>
                                </Avatar>
                                <span className="text-xs truncate flex-1">{user.displayName || user.email}</span>
                                {selectedIds.includes(user.uid) && <Check className="h-3 w-3 text-primary" />}
                            </label>
                        ))}
                        {users.length === 0 && (
                            <p className="text-[10px] text-muted-foreground p-2 text-center">No users found</p>
                        )}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
