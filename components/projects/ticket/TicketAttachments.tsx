import { useState, useRef } from 'react';
import { Attachment } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ExternalLink, Trash2, Plus, Paperclip, Upload, Loader2 } from 'lucide-react';
import { MediaPreview } from './MediaPreview';

interface TicketAttachmentsProps {
    attachments: Attachment[];
    onChange: (attachments: Attachment[]) => void;
    readOnly?: boolean;
    projectId: string;
    projectName?: string;
    ticketId: string;
}

export function TicketAttachments({ attachments, onChange, readOnly, projectId, projectName, ticketId }: TicketAttachmentsProps) {
    const [isAdding, setIsAdding] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [newName, setNewName] = useState('');
    const [newUrl, setNewUrl] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAddLink = () => {
        if (!newName.trim() || !newUrl.trim()) return;

        const newAttachment: Attachment = {
            id: crypto.randomUUID(),
            name: newName,
            type: 'link',
            url: newUrl,
            uploadedAt: new Date(),
            uploadedBy: 'user', // Ideally passed from auth context
        };

        onChange([...attachments, newAttachment]);
        setNewName('');
        setNewUrl('');
        setIsAdding(false);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        console.log('🚀 Starting upload for:', file.name, { projectId, ticketId });
        try {
            // 1. Get Folder ID (Project/Ticket specific)
            console.log('⏳ Getting folder ID...');
            const folderRes = await fetch('/api/box/folder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId, ticketId, projectName }),
            });

            if (!folderRes.ok) {
                const err = await folderRes.json().catch(() => ({ error: 'Unknown error' }));
                console.error('❌ Folder API failed:', err);
                throw new Error(`Folder API failed: ${err.error}`);
            }

            const { folderId } = await folderRes.json();
            console.log('✅ Got folder ID:', folderId);

            // 2. Upload to Box via our server proxy
            console.log('⏳ Uploading to proxy...');
            const formData = new FormData();
            formData.append('file', file);
            formData.append('folderId', folderId || '0');

            const uploadRes = await fetch('/api/box/upload', {
                method: 'POST',
                body: formData,
            });

            if (!uploadRes.ok) {
                const err = await uploadRes.json().catch(() => ({ error: 'Unknown error' }));
                console.error('❌ Upload API failed:', err);
                throw new Error(`Upload API failed: ${err.error}`);
            }

            const boxFile = await uploadRes.json();
            console.log('✅ Uploaded to Box:', boxFile.id);

            // 3. Finalize on server (generate shared link, etc.)
            console.log('⏳ Finalizing...');
            const finalizeRes = await fetch('/api/box/finalize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileId: boxFile.id }),
            });

            if (!finalizeRes.ok) {
                console.error('❌ Finalize API failed');
                throw new Error('Finalize API failed');
            }

            const { sharedLink } = await finalizeRes.json();
            console.log('✅ Finalized with shared link:', sharedLink);

            // 4. Update parent
            const mimeType = file.type;
            const fileName = file.name.toLowerCase();
            const mainType = mimeType.split('/')[0];

            let finalType: Attachment['type'] = 'other';
            if (['image', 'audio', 'video'].includes(mainType)) {
                finalType = mainType as any;
            } else if (
                mimeType === 'application/pdf' ||
                fileName.endsWith('.pdf') ||
                fileName.endsWith('.doc') ||
                fileName.endsWith('.docx') ||
                fileName.endsWith('.xls') ||
                fileName.endsWith('.xlsx') ||
                fileName.endsWith('.ppt') ||
                fileName.endsWith('.pptx')
            ) {
                finalType = 'document';
            }

            const newAttachment: Attachment = {
                id: crypto.randomUUID(),
                name: file.name,
                type: finalType,
                boxFileId: boxFile.id,
                boxSharedLink: sharedLink,
                uploadedAt: new Date(),
                uploadedBy: 'user',
            };

            onChange([...attachments, newAttachment]);
            console.log('✨ All done!');
        } catch (error: any) {
            console.error('‼️ File upload error:', error);
            alert(`Upload failed: ${error.message || 'Check console for details'}`);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
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
                {!readOnly && (
                    <div className="flex gap-2">
                        <input
                            type="file"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            accept="image/*,audio/*,video/*"
                        />
                        <Button
                            onClick={() => fileInputRef.current?.click()}
                            variant="outline"
                            size="sm"
                            disabled={isUploading}
                        >
                            {isUploading ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <Upload className="h-3 w-3 mr-2" />}
                            Upload File
                        </Button>
                        <Button onClick={() => setIsAdding(true)} variant="ghost" size="sm">
                            <Plus className="h-3 w-3 mr-2" />
                            Add Link
                        </Button>
                    </div>
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
                        <Button size="sm" onClick={handleAddLink} disabled={!newName || !newUrl}>Add</Button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-4">
                {attachments.map((att) => (
                    <div key={att.id} className="relative group">
                        <MediaPreview attachment={att} />
                        {!readOnly && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-background border shadow-sm text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                onClick={() => handleRemove(att.id)}
                            >
                                <Trash2 className="h-3 w-3" />
                            </Button>
                        )}
                    </div>
                ))}
                {attachments.length === 0 && !isAdding && !isUploading && (
                    <p className="text-sm text-muted-foreground italic text-center py-4">
                        No attachments yet.
                    </p>
                )}
                {isUploading && (
                    <div className="flex items-center justify-center p-8 border border-dashed rounded-md bg-muted/10">
                        <div className="flex flex-col items-center gap-2">
                            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                            <p className="text-sm text-muted-foreground">Uploading to Box...</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
