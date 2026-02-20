'use client';

import { useEditor, EditorContent, Editor, Node, ReactNodeViewRenderer, mergeAttributes } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Button } from '@/components/ui/button';
import {
    Bold,
    Italic,
    Strikethrough,
    List,
    ListOrdered,
    Link as LinkIcon,
    Image as ImageIcon,
    Loader2
} from 'lucide-react';
import { forwardRef, useImperativeHandle, useState, useEffect, useRef } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { MediaPreview } from '../projects/ticket/MediaPreview';

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        media: {
            setMedia: (options: {
                id?: string;
                name: string;
                type: 'audio' | 'video' | 'image' | 'document' | 'other';
                boxFileId?: string;
                boxSharedLink?: string;
                url: string;
                uploadedAt?: Date;
                uploadedBy?: string;
            }) => ReturnType;
        };
    }
}

// Custom Media Extension
const MediaExtension = Node.create({
    name: 'media',
    group: 'block',
    atom: true,
    selectable: true,
    draggable: true,

    addAttributes() {
        return {
            id: { default: null },
            name: { default: null },
            type: { default: 'other' },
            boxFileId: { default: null },
            boxSharedLink: { default: null },
            url: { default: null },
            uploadedAt: { default: null },
            uploadedBy: { default: null },
        };
    },

    parseHTML() {
        return [{ tag: 'div[data-media-node]' }];
    },

    renderHTML({ HTMLAttributes }) {
        return ['div', mergeAttributes(HTMLAttributes, { 'data-media-node': 'true' })];
    },

    addNodeView() {
        return ReactNodeViewRenderer(MediaPreview);
    },

    addCommands() {
        return {
            setMedia: (options) => ({ commands }) => {
                return commands.insertContent({
                    type: this.name,
                    attrs: options,
                });
            },
        };
    },
});

interface DescriptionEditorProps {
    content: string;
    onChange: (html: string) => void;
    placeholder?: string;
    editable?: boolean;
    projectId?: string;
    ticketId?: string;
    projectName?: string;
    clientName?: string;
}

export interface DescriptionEditorHandle {
    uploadFiles: (files: File[]) => Promise<void>;
    insertLink: () => void;
    focus: () => void;
    isUploading: boolean;
    isReady: boolean;
    setContent: (content: string) => void;
}

const DescriptionEditor = forwardRef<DescriptionEditorHandle, DescriptionEditorProps>(
    ({ content, onChange, placeholder = 'Add a description...', editable = true, projectId, ticketId, projectName, clientName }, ref) => {
        const [isUploading, setIsUploading] = useState(false);
        const [isLinkPopoverOpen, setIsLinkPopoverOpen] = useState(false);
        const [linkUrl, setLinkUrl] = useState('');
        const [linkText, setLinkText] = useState('');

        // Use ref to avoid stale closures in Tiptap/Imperative handles
        const propsRef = useRef({ projectId, ticketId, projectName, clientName });
        useEffect(() => {
            propsRef.current = { projectId, ticketId, projectName, clientName };
        }, [projectId, ticketId, projectName, clientName]);

        const editor = useEditor({
            extensions: [
                StarterKit,
                Placeholder.configure({
                    placeholder,
                }),
                MediaExtension,
            ],
            content: content,
            editable: editable,
            immediatelyRender: false,
            onUpdate: ({ editor }) => {
                const html = editor.getHTML();
                onChange(html);
            },
            editorProps: {
                attributes: {
                    class: 'prose prose-sm max-w-none focus:outline-none min-h-[150px] p-4',
                },
                handleDrop: (view, event, slice, moved) => {
                    if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
                        event.preventDefault();
                        event.stopPropagation();

                        // Resolve drop position and sync selection so files land exactly where dropped
                        const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
                        if (coordinates) {
                            editor?.commands.setTextSelection(coordinates.pos);
                        }

                        const files = Array.from(event.dataTransfer.files);
                        uploadFiles(files);
                        return true;
                    }
                    return false;
                }
            },
        });

        const uploadFile = async (file: File, retryCount = 0): Promise<any> => {
            const { projectId, ticketId, projectName, clientName } = propsRef.current;
            console.log(`🚀 [Editor] uploadFile ${file.name} (attempt ${retryCount + 1})`, { projectId, ticketId, projectName, clientName });

            try {
                const body = {
                    projectId,
                    ticketId,
                    projectName,
                    clientName,
                    fileName: file.name,
                    mimeType: file.type
                };

                const folderRes = await fetch('/api/box/folder', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });

                if (!folderRes.ok) {
                    const err = await folderRes.json().catch(() => ({ error: 'Unknown error' }));
                    const msg = err.details ? `${err.error}: ${err.details}` : (err.error || folderRes.statusText);
                    throw new Error(`Failed to get folder ID: ${msg}`);
                }
                const { folderId } = await folderRes.json();

                const formData = new FormData();
                formData.append('file', file);
                formData.append('folderId', folderId || '0');

                const uploadRes = await fetch('/api/box/upload', {
                    method: 'POST',
                    body: formData,
                });

                if (!uploadRes.ok) {
                    const err = await uploadRes.json().catch(() => ({ error: 'Unknown error' }));
                    const errorMsg = err.details || err.error || uploadRes.statusText;

                    // Handle 409 name_temporarily_reserved with retry
                    const isConflict = uploadRes.status === 409 &&
                        (errorMsg.includes('name_temporarily_reserved') ||
                            (err.error && String(err.error).includes('name_temporarily_reserved')));

                    if (isConflict && retryCount < 3) {
                        const delay = 1000 * (retryCount + 1);
                        console.warn(`⚠️ Box 409 conflict for ${file.name}. Retrying in ${delay}ms...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        return uploadFile(file, retryCount + 1);
                    }

                    throw new Error(`Upload failed: ${errorMsg}`);
                }
                const boxFile = await uploadRes.json();

                const finalizeRes = await fetch('/api/box/finalize', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fileId: boxFile.id }),
                });

                if (!finalizeRes.ok) {
                    const err = await finalizeRes.json().catch(() => ({ error: 'Unknown error' }));
                    throw new Error(`Finalize failed: ${err.error || finalizeRes.statusText}`);
                }
                const { sharedLink } = await finalizeRes.json();

                // Determine type
                const mimeType = file.type;
                const fileName = file.name.toLowerCase();
                const mainType = mimeType.split('/')[0];

                let finalType: any = 'other';
                if (['image', 'audio', 'video'].includes(mainType)) {
                    finalType = mainType;
                } else if (
                    mimeType === 'application/pdf' ||
                    fileName.endsWith('.pdf') ||
                    fileName.endsWith('.doc') ||
                    fileName.endsWith('.docx')
                ) {
                    finalType = 'document';
                }

                return {
                    name: file.name,
                    url: sharedLink,
                    type: finalType,
                    boxFileId: boxFile.id,
                    boxSharedLink: sharedLink,
                };
            } catch (error: any) {
                console.error('Upload Error:', error);
                throw error;
            }
        };

        const uploadFiles = async (files: File[]) => {
            if (!editor) {
                console.warn('⚠️ DescriptionEditor.uploadFiles called but editor is not ready.');
                return;
            }
            setIsUploading(true);

            // If the editor is not focused (e.g. drop on dialog background), 
            // focus the end to avoid defaulting to position 0 (top of document)
            if (!editor.isFocused) {
                editor.commands.focus('end');
            }

            for (const file of files) {
                try {
                    console.log('⏳ Starting upload for:', file.name);
                    const result = await uploadFile(file);
                    console.log('✅ Upload result:', result);

                    if (result.type === 'image' || ['audio', 'video', 'document'].includes(result.type)) {
                        console.log(`🎬 Inserting media node:`, result);

                        // Insert at current selection
                        editor.chain()
                            .focus()
                            .insertContent([
                                { type: 'media', attrs: result },
                                { type: 'paragraph' }
                            ])
                            .run();
                        console.log('✨ Insertion committed at cursor');
                    } else {
                        // Generic link for others
                        console.log('🔗 Inserting generic link:', result.name);
                        editor.chain()
                            .focus()
                            .insertContent([
                                {
                                    type: 'text',
                                    text: result.name,
                                    marks: [{ type: 'link', attrs: { href: result.url } }]
                                },
                                {
                                    type: 'text',
                                    text: ' '
                                }
                            ])
                            .run();
                    }
                    console.log('📝 After Insertion HTML:', editor.getHTML());
                } catch (error: any) {
                    console.error('❌ Upload/Insertion error:', error);
                    alert(error.message || `Failed to upload ${file.name}`);
                }
            }
            setIsUploading(false);
        };

        const handleOpenLinkPopover = () => {
            if (!editor) return;
            const previousUrl = editor.getAttributes('link').href || '';
            const { from, to } = editor.state.selection;
            const selectedText = editor.state.doc.textBetween(from, to, ' ');

            setLinkUrl(previousUrl);
            setLinkText(selectedText || '');
            setIsLinkPopoverOpen(true);
        };

        const handleApplyLink = () => {
            if (!editor || !linkUrl.trim()) return;

            const url = linkUrl.trim();
            const text = linkText.trim() || url;

            const { from, to } = editor.state.selection;
            const hasSelection = from !== to;

            if (hasSelection) {
                editor.chain().focus()
                    .extendMarkRange('link')
                    .setLink({ href: url })
                    .insertContent(text)
                    .run();
            } else {
                editor.chain().focus()
                    .insertContent({
                        type: 'text',
                        text: text,
                        marks: [{ type: 'link', attrs: { href: url } }]
                    })
                    .insertContent(' ')
                    .run();
            }

            setIsLinkPopoverOpen(false);
            setLinkUrl('');
            setLinkText('');
        };

        const removeLink = () => {
            editor?.chain().focus().extendMarkRange('link').unsetLink().run();
            setIsLinkPopoverOpen(false);
        };

        const addImage = () => {
            const url = window.prompt('Image URL');
            if (url) {
                editor?.chain().focus().setImage({ src: url }).run();
            }
        };

        useImperativeHandle(ref, () => ({
            uploadFiles,
            insertLink: handleOpenLinkPopover,
            focus: () => editor?.commands.focus(),
            isUploading,
            isReady: !!editor,
            setContent: (newContent: string) => {
                // Use setTimeout to avoid "flushSync was called from inside a lifecycle method"
                // which happens when setContent is called during a React render/commit phase.
                setTimeout(() => {
                    editor?.commands.setContent(newContent, { emitUpdate: false });
                }, 0);
            },
        }));

        if (!editor) {
            return null;
        }

        return (
            <div className="border rounded-md bg-white overflow-hidden flex flex-col min-h-[200px]">
                {editable && (
                    <div className="flex items-center gap-1 p-1 border-b bg-muted/40 flex-wrap">
                        <Button
                            variant="ghost"
                            size="icon"
                            tabIndex={-1}
                            className={cn("h-7 w-7", editor.isActive('bold') ? 'bg-muted' : '')}
                            onClick={() => editor.chain().focus().toggleBold().run()}
                            title="Bold"
                        >
                            <Bold className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            tabIndex={-1}
                            className={cn("h-7 w-7", editor.isActive('italic') ? 'bg-muted' : '')}
                            onClick={() => editor.chain().focus().toggleItalic().run()}
                            title="Italic"
                        >
                            <Italic className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            tabIndex={-1}
                            className={cn("h-7 w-7", editor.isActive('strike') ? 'bg-muted' : '')}
                            onClick={() => editor.chain().focus().toggleStrike().run()}
                            title="Strike"
                        >
                            <Strikethrough className="h-4 w-4" />
                        </Button>
                        <div className="w-px h-4 bg-border mx-1" />
                        <Button
                            variant="ghost"
                            size="icon"
                            tabIndex={-1}
                            className={cn("h-7 w-7", editor.isActive('bulletList') ? 'bg-muted' : '')}
                            onClick={() => editor.chain().focus().toggleBulletList().run()}
                            title="Bullet List"
                        >
                            <List className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            tabIndex={-1}
                            className={cn("h-7 w-7", editor.isActive('orderedList') ? 'bg-muted' : '')}
                            onClick={() => editor.chain().focus().toggleOrderedList().run()}
                            title="Ordered List"
                        >
                            <ListOrdered className="h-4 w-4" />
                        </Button>
                        <div className="w-px h-4 bg-border mx-1" />

                        <Popover open={isLinkPopoverOpen} onOpenChange={setIsLinkPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    tabIndex={-1}
                                    className={cn("h-7 w-7", editor.isActive('link') ? 'bg-muted' : '')}
                                    onClick={handleOpenLinkPopover}
                                    title="Link"
                                >
                                    <LinkIcon className="h-4 w-4" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-4" align="start">
                                <div className="grid gap-4">
                                    <div className="space-y-2">
                                        <h4 className="font-medium leading-none text-sm">Insert Link</h4>
                                        <p className="text-xs text-muted-foreground">
                                            Add a URL and optional display text.
                                        </p>
                                    </div>
                                    <div className="grid gap-2">
                                        <div className="grid gap-1">
                                            <Label htmlFor="url" className="text-[10px] font-semibold uppercase opacity-70">URL</Label>
                                            <Input
                                                id="url"
                                                placeholder="https://example.com"
                                                className="h-8 text-xs"
                                                value={linkUrl}
                                                onChange={(e) => setLinkUrl(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleApplyLink()}
                                                autoFocus
                                            />
                                        </div>
                                        <div className="grid gap-1">
                                            <Label htmlFor="text" className="text-[10px] font-semibold uppercase opacity-70">Display Text</Label>
                                            <Input
                                                id="text"
                                                placeholder="Display name (optional)"
                                                className="h-8 text-xs"
                                                value={linkText}
                                                onChange={(e) => setLinkText(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleApplyLink()}
                                            />
                                        </div>
                                        <div className="flex justify-between items-center mt-2">
                                            {editor.isActive('link') ? (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 text-[10px] text-destructive hover:bg-destructive/10"
                                                    onClick={removeLink}
                                                >
                                                    Remove Link
                                                </Button>
                                            ) : <div />}
                                            <div className="flex gap-2">
                                                <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => setIsLinkPopoverOpen(false)}>Cancel</Button>
                                                <Button size="sm" className="h-7 text-[10px]" onClick={handleApplyLink} disabled={!linkUrl.trim()}>Apply</Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>

                        <Button
                            variant="ghost"
                            size="icon"
                            tabIndex={-1}
                            className={cn("h-7 w-7")}
                            onClick={addImage}
                            title="Image URL"
                        >
                            <ImageIcon className="h-4 w-4" />
                        </Button>

                        {isUploading && (
                            <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Uploading...
                            </div>
                        )}
                    </div>
                )}

                <EditorContent editor={editor} className="flex-1 [&_.ProseMirror]:min-h-[150px] [&_.ProseMirror]:p-4 [&_.ProseMirror]:focus:outline-none" />

                <style jsx global>{`
                    .ProseMirror p.is-editor-empty:first-child::before {
                        color: #adb5bd;
                        content: attr(data-placeholder);
                        float: left;
                        height: 0;
                        pointer-events: none;
                    }
                    .ProseMirror ul {
                        list-style-type: disc;
                        padding-left: 1.5em;
                    }
                    .ProseMirror ol {
                        list-style-type: decimal;
                        padding-left: 1.5em;
                    }
                    .ProseMirror a {
                         color: #3b82f6;
                         text-decoration: underline;
                         cursor: pointer;
                    }
                    .ProseMirror img {
                        max-width: 100%;
                        height: auto;
                        border-radius: 4px;
                        display: inline-block;
                    }
                `}</style>
            </div>
        );
    }
);

DescriptionEditor.displayName = 'DescriptionEditor';

export { DescriptionEditor };
