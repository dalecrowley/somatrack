import { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { Attachment } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ExternalLink, Trash2, Plus, Paperclip, Upload, Loader2, Download } from 'lucide-react';
import { MediaPreview } from './MediaPreview';

interface TicketAttachmentsProps {
    attachments: Attachment[];
    onChange: (attachments: Attachment[]) => void;
    readOnly?: boolean;
    projectId: string;
    projectName?: string;
    ticketId: string;
}

export interface TicketAttachmentsHandle {
    triggerUpload: () => void;
    triggerAddLink: () => void;
    uploadFiles: (files: File[]) => Promise<void>;
}

export const TicketAttachments = forwardRef<TicketAttachmentsHandle, TicketAttachmentsProps>(
    ({ attachments, onChange, readOnly, projectId, projectName, ticketId }, ref) => {
        const [isAdding, setIsAdding] = useState(false);
        const [isUploading, setIsUploading] = useState(false);
        const [newName, setNewName] = useState('');
        const [newUrl, setNewUrl] = useState('');
        const fileInputRef = useRef<HTMLInputElement>(null);

        const uploadFile = async (file: File) => {
            console.log('🚀 Starting upload for:', file.name, { projectId, ticketId });
            try {
                let folderId = customFolderId.trim();

                if (!folderId) {
                    // 1. Get Folder ID (Project/Ticket specific) - organized by type
                    console.log('⏳ Getting folder ID...');
                    const folderRes = await fetch('/api/box/folder', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            projectId,
                            ticketId,
                            projectName,
                            fileName: file.name,
                            mimeType: file.type
                        }),
                    });

                    if (!folderRes.ok) {
                        const err = await folderRes.json().catch(() => ({ error: 'Unknown error' }));
                        console.error('❌ Folder API failed:', err);
                        throw new Error(`Folder API failed: ${err.error}`);
                    }

                    const data = await folderRes.json();
                    folderId = data.folderId;
                    console.log('✅ Got folder ID:', folderId);
                } else {
                    console.log('📂 Using custom folder ID:', folderId);
                }

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
                    const errorToThrow = new Error(`Upload API failed: ${err.error}`);
                    (errorToThrow as any).details = err.details || err.code || '';
                    throw errorToThrow;
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

                return newAttachment;
            } catch (error: any) {
                console.error('‼️ File upload error:', error);
                const detailMsg = error.details || '';
                throw new Error(`Upload failed for ${file.name}: ${error.message}${detailMsg ? ` (${detailMsg})` : ''}`);
            }
        };

        const uploadFiles = async (files: File[]) => {
            setIsUploading(true);
            try {
                const newAttachments: Attachment[] = [];
                for (const file of files) {
                    try {
                        const attachment = await uploadFile(file);
                        newAttachments.push(attachment);
                    } catch (error: any) {
                        alert(error.message);
                    }
                }
                if (newAttachments.length > 0) {
                    onChange([...attachments, ...newAttachments]);
                }
            } finally {
                setIsUploading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };

        useImperativeHandle(ref, () => ({
            triggerUpload: () => fileInputRef.current?.click(),
            triggerAddLink: () => setIsAdding(true),
            uploadFiles
        }));

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

        const [customFolderId, setCustomFolderId] = useState('');

        const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
            const files = e.target.files;
            if (!files || files.length === 0) return;
            await uploadFiles(Array.from(files));
        };

        const handleRemove = (id: string) => {
            onChange(attachments.filter(a => a.id !== id));
        };

        return (
            <div className="space-y-4">
                {isAdding && (
                    <div className="p-3 border rounded-md space-y-3 bg-muted/20">
                        <div className="grid gap-2">
                            <Label className="text-[10px]">Name</Label>
                            <Input
                                className="h-8 text-xs"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="e.g., Design Brief"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label className="text-[10px]">URL</Label>
                            <Input
                                className="h-8 text-xs"
                                value={newUrl}
                                onChange={(e) => setNewUrl(e.target.value)}
                                placeholder="https://..."
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => setIsAdding(false)}>Cancel</Button>
                            <Button size="sm" className="h-7 text-[10px]" onClick={handleAddLink} disabled={!newName || !newUrl}>Add</Button>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 gap-4">
                    <input
                        type="file"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept="image/*,audio/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx"
                    />
                    {attachments.map((att) => (
                        <div key={att.id} className="relative group">
                            <MediaPreview attachment={att} />
                            {!readOnly && (
                                <div className="absolute top-1 right-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-background/80 backdrop-blur-sm rounded-md border shadow-sm p-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-muted-foreground hover:text-primary"
                                        title="Open in Box"
                                        onClick={() => window.open(att.boxSharedLink || att.url, '_blank')}
                                    >
                                        <ExternalLink className="h-3 w-3" />
                                    </Button>
                                    {att.boxFileId && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-muted-foreground hover:text-primary"
                                            title="Download"
                                            asChild
                                        >
                                            <a href={`/api/box/content/${att.boxFileId}`} download>
                                                <Download className="h-3 w-3" />
                                            </a>
                                        </Button>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                        title="Delete"
                                        onClick={() => handleRemove(att.id)}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
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
);
