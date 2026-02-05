'use client';

import { useState } from 'react';
import { Attachment } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ExternalLink, Trash2, Plus, Paperclip } from 'lucide-react';

interface TicketAttachmentsProps {
    attachments: Attachment[];
    onChange: (attachments: Attachment[]) => void;
}

export function TicketAttachments({ attachments, onChange }: TicketAttachmentsProps) {
    const [isAdding, setIsAdding] = useState(false);
    const [newName, setNewName] = useState('');
    const [newUrl, setNewUrl] = useState('');

    const handleAdd = () => {
        if (!newName.trim() || !newUrl.trim()) return;

        const newAttachment: Attachment = {
            id: crypto.randomUUID(), // Local ID until creation (or permanent if using this structure)
            name: newName,
            type: 'link', // Treating all as links for now
            url: newUrl, // We need to update the Attachment type to support generic URLs if it doesn't already
            boxFileId: '',
            boxSharedLink: newUrl, // Using this field or adding a generic 'url' field
            uploadedAt: new Date(),
            uploadedBy: 'user', // Ideally passed from parent
        } as any; // Casting to satisfy TS if type mismatch, relying on impl details

        onChange([...attachments, newAttachment]);
        setNewName('');
        setNewUrl('');
        setIsAdding(false);
    };

    const handleRemove = (id: string) => {
        onChange(attachments.filter(a => a.id !== id));
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium flex items-center gap-2">
                    <Paperclip className="h-4 w-4" />
                    Attachments ({attachments.length})
                </h4>
                {!isAdding && (
                    <Button onClick={() => setIsAdding(true)} variant="outline" size="sm">
                        <Plus className="h-3 w-3 mr-2" />
                        Add Link
                    </Button>
                )}
            </div>

            {isAdding && (
                <div className="p-3 border rounded-md space-y-3 bg-muted/20">
                    <div className="grid gap-2">
                        <Label>Name</Label>
                        <Input
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="e.g., Design Brief"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label>URL</Label>
                        <Input
                            value={newUrl}
                            onChange={(e) => setNewUrl(e.target.value)}
                            placeholder="https://..."
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}>Cancel</Button>
                        <Button size="sm" onClick={handleAdd} disabled={!newName || !newUrl}>Add</Button>
                    </div>
                </div>
            )}

            <div className="space-y-2">
                {attachments.map((att) => (
                    <div key={att.id} className="flex items-center justify-between p-2 border rounded-md bg-card group">
                        <div className="flex items-center gap-2 overflow-hidden">
                            <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <a
                                href={att.boxSharedLink || (att as any).url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-medium hover:underline truncate"
                            >
                                {att.name}
                            </a>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleRemove(att.id)}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
                {attachments.length === 0 && !isAdding && (
                    <p className="text-sm text-muted-foreground italic text-center py-4">
                        No attachments yet.
                    </p>
                )}
            </div>
        </div>
    );
}
