'use client';

import { UserProfile } from '@/types';
import { useUsers } from '@/hooks/useUsers';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface TicketAssigneePickerProps {
    value?: string;
    onValueChange: (value: string) => void;
}

export function TicketAssigneePicker({ value, onValueChange }: TicketAssigneePickerProps) {
    const { users, loading } = useUsers();

    if (loading) return <div className="h-10 w-full animate-pulse bg-muted rounded-md" />;

    return (
        <Select value={value} onValueChange={onValueChange}>
            <SelectTrigger>
                <SelectValue placeholder="Unassigned" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {users.map((user) => (
                    <SelectItem key={user.uid} value={user.uid}>
                        <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                                <AvatarImage src={user.photoURL || undefined} />
                                <AvatarFallback>{user.displayName?.[0] || '?'}</AvatarFallback>
                            </Avatar>
                            <span>{user.displayName || user.email}</span>
                        </div>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
