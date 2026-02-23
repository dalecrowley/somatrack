import { useState, useRef, forwardRef, useImperativeHandle, useEffect } from 'react';
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
    clientName?: string;
    ticketId: string;
}

export interface TicketAttachmentsHandle {
    triggerUpload: () => void;
    triggerAddLink: () => void;
    uploadFiles: (files: File[]) => Promise<void>;
}

export const TicketAttachments = forwardRef<TicketAttachmentsHandle, TicketAttachmentsProps>(
    ({ attachments, onChange, readOnly, projectId, projectName, clientName, ticketId }, ref) => {
        const [isAdding, setIsAdding] = useState(false);
        const [isUploading, setIsUploading] = useState(false);
        const [pendingUploads, setPendingUploads] = useState<{ [key: string]: { name: string, progress: number } }>({});
        const [newName, setNewName] = useState('');
        const [newUrl, setNewUrl] = useState('');
        const fileInputRef = useRef<HTMLInputElement>(null);

        // Use ref to avoid stale closures in handles
        const propsRef = useRef({ projectId, ticketId, projectName, clientName });
        useEffect(() => {
            propsRef.current = { projectId, ticketId, projectName, clientName };
        }, [projectId, ticketId, projectName, clientName]);

        const uploadFile = async (file: File, onProgress?: (percent: number) => void) => {
            const { projectId, ticketId, projectName, clientName } = propsRef.current;
            console.log('🚀 [Attachments] Starting upload for:', file.name, { projectId, ticketId, projectName, clientName });
            try {
                let folderId = customFolderId.trim();

                if (!folderId) {
                    // 1. Get Folder ID (Project/Ticket specific) - organized by type
                    const body = {
                        projectId,
                        ticketId,
                        projectName,
                        clientName,
                        fileName: file.name,
                        mimeType: file.type
                    };
                    console.log('🚀 [Attachments] uploadFile props:', { projectId, ticketId, projectName, clientName });
                    console.log('📡 [Attachments] POST /api/box/folder payload:', body);

                    const folderRes = await fetch('/api/box/folder', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body),
                    });

                    if (!folderRes.ok) {
                        const err = await folderRes.json().catch(() => ({ error: 'Unknown error' }));
                        const msg = err.details ? `${err.error}: ${err.details}` : (err.error || folderRes.statusText);
                        console.error('❌ Folder API failed:', err);
                        throw new Error(`Folder API failed: ${msg}`);
                    }

                    const data = await folderRes.json();
                    folderId = data.folderId;
                    console.log('✅ Got folder ID:', folderId);
                } else {
                    console.log('📂 Using custom folder ID:', folderId);
                }

                // 2. Upload with XHR for progress
                const boxFile = await new Promise<any>((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    const formData = new FormData();
                    formData.append('file', file);
                    formData.append('folderId', folderId || '0');

                    xhr.upload.onprogress = (event) => {
                        if (event.lengthComputable && onProgress) {
                            const percent = (event.loaded / event.total) * 100;
                            onProgress(percent);
                        }
                    };

                    xhr.onload = () => {
                        if (xhr.status >= 200 && xhr.status < 300) {
                            try {
                                resolve(JSON.parse(xhr.responseText));
                            } catch (e) {
                                reject(new Error('Invalid response from server'));
                            }
                        } else {
                            const err = JSON.parse(xhr.responseText || '{}');
                            const errorToThrow = new Error(`Upload failed: ${err.error || xhr.statusText}`);
                            (errorToThrow as any).details = err.details || err.code || '';
                            reject(errorToThrow);
                        }
                    };

                    xhr.onerror = () => reject(new Error('Network error during upload'));

                    xhr.open('POST', '/api/box/upload');
                    xhr.send(formData);
                });

                console.log('✅ Uploaded to Box:', boxFile.id);

                // 3. Finalize
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
                    const uploadId = crypto.randomUUID();
                    setPendingUploads(prev => ({ ...prev, [uploadId]: { name: file.name, progress: 0 } }));

                    try {
                        const attachment = await uploadFile(file, (percent) => {
                            setPendingUploads(prev => ({
                                ...prev,
                                [uploadId]: { ...prev[uploadId], progress: percent }
                            }));
                        });
                        newAttachments.push(attachment);
                    } catch (error: any) {
                        alert(error.message);
                    } finally {
                        setPendingUploads(prev => {
                            const next = { ...prev };
                            delete next[uploadId];
                            return next;
                        });
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
                    {Object.entries(pendingUploads).map(([id, upload]) => (
                        <div key={id} className="p-4 border border-dashed rounded-md bg-indigo-50/20 border-indigo-200 flex flex-col gap-2">
                            <div className="flex items-center gap-2 text-indigo-600">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="text-xs font-medium truncate flex-1">Uploading {upload.name}...</span>
                                <span className="text-[10px] font-bold">{Math.round(upload.progress)}%</span>
                            </div>
                            <div className="w-full h-1 bg-indigo-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-indigo-500 transition-all duration-300"
                                    style={{ width: `${upload.progress}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
);
