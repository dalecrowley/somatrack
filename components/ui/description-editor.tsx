'use client';

import { useEditor, EditorContent, Editor, Node, ReactNodeViewRenderer, mergeAttributes, NodeViewWrapper } from '@tiptap/react';
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
        loadingMedia: {
            setLoadingMedia: (options: {
                id: string;
                name: string;
                progress: number;
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
            width: { default: '30%' },
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

// Custom Loading Media Extension
const LoadingMediaExtension = Node.create({
    name: 'loadingMedia',
    group: 'block',
    atom: true,
    selectable: true,
    draggable: false,

    addAttributes() {
        return {
            id: { default: null },
            name: { default: 'Uploading...' },
            progress: { default: 0 },
        };
    },

    parseHTML() {
        return [{ tag: 'div[data-loading-media-node]' }];
    },

    renderHTML({ HTMLAttributes }) {
        return ['div', mergeAttributes(HTMLAttributes, { 'data-loading-media-node': 'true' })];
    },

    addNodeView() {
        return ReactNodeViewRenderer(({ node }) => {
            const { name, progress } = node.attrs;
            return (
                <NodeViewWrapper className="my-4">
                    <div className="p-4 border border-indigo-200 bg-indigo-50/30 rounded-lg flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-indigo-600">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm font-medium">Uploading {name}...</span>
                            <span className="ml-auto text-xs font-bold">{Math.round(progress)}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-indigo-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-indigo-500 transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                </NodeViewWrapper>
            );
        });
    },

    addCommands() {
        return {
            setLoadingMedia: (options) => ({ commands }) => {
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
    onDropFiles?: () => void;
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
    ({ content, onChange, placeholder = 'Add a description...', editable = true, projectId, ticketId, projectName, clientName, onDropFiles }, ref) => {
        const [isUploading, setIsUploading] = useState(false);
        const [isLinkPopoverOpen, setIsLinkPopoverOpen] = useState(false);
        const [linkUrl, setLinkUrl] = useState('');
        const [linkText, setLinkText] = useState('');

        // Use ref to avoid stale closures in Tiptap/Imperative handles
        const propsRef = useRef({ projectId, ticketId, projectName, clientName, onDropFiles });
        useEffect(() => {
            propsRef.current = { projectId, ticketId, projectName, clientName, onDropFiles };
        }, [projectId, ticketId, projectName, clientName, onDropFiles]);

        const editor = useEditor({
            extensions: [
                StarterKit,
                Placeholder.configure({
                    placeholder,
                }),
                MediaExtension,
                LoadingMediaExtension,
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

                        if (propsRef.current.onDropFiles) {
                            propsRef.current.onDropFiles();
                        }

                        return true;
                    }
                    return false;
                },
                handleClick: (view, pos, event) => {
                    // If the user clicks into an already focused editor, 
                    // we might want to let them place the cursor normally.
                    // But if it's the first click or click on container, 
                    // maybe we apply the logic.
                    // The request says "when clicking in an edit box, please place the cursor on a new line after the last line"
                    // To be safe and less intrusive, we'll primarily rely on the .focus() call
                    // but we can add logic here if needed.
                    return false;
                }
            },
        });

        const uploadFile = async (file: File, retryCount = 0, onProgress?: (percent: number) => void): Promise<any> => {
            const { projectId, ticketId, projectName, clientName } = propsRef.current;
            console.log(`🚀 [Editor] uploadFile ${file.name} (attempt ${retryCount + 1})`, { projectId, ticketId, projectName, clientName });

            try {
                // 1. Get/Create folder
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
                            // Handle 409 conflict like before
                            let errBody: any = {};
                            try { errBody = JSON.parse(xhr.responseText); } catch (e) { }
                            const errorMsg = errBody.details || errBody.error || xhr.statusText;

                            const isConflict = xhr.status === 409 &&
                                (errorMsg.includes('name_temporarily_reserved') ||
                                    (errBody.error && String(errBody.error).includes('name_temporarily_reserved')));

                            if (isConflict && retryCount < 3) {
                                resolve('RETRY');
                            } else {
                                reject(new Error(`Upload failed: ${errorMsg}`));
                            }
                        }
                    };

                    xhr.onerror = () => reject(new Error('Network error during upload'));

                    xhr.open('POST', '/api/box/upload');
                    xhr.send(formData);
                });

                if (boxFile === 'RETRY') {
                    const delay = 1000 * (retryCount + 1);
                    console.warn(`⚠️ Box 409 conflict for ${file.name}. Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    return uploadFile(file, retryCount + 1, onProgress);
                }

                // 3. Finalize
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
                const uploadId = crypto.randomUUID();
                try {
                    console.log('⏳ Starting upload for:', file.name);

                    // 1. Insert loading node
                    editor.chain()
                        .focus()
                        .insertContent({
                            type: 'loadingMedia',
                            attrs: { id: uploadId, name: file.name, progress: 0 }
                        })
                        .run();

                    const onProgress = (percent: number) => {
                        const { tr } = editor.state;
                        let dispatch = false;

                        editor.state.doc.descendants((node, pos) => {
                            if (node.type.name === 'loadingMedia' && node.attrs.id === uploadId) {
                                tr.setNodeMarkup(pos, undefined, {
                                    ...node.attrs,
                                    progress: percent
                                });
                                dispatch = true;
                                return false;
                            }
                        });

                        if (dispatch) {
                            editor.view.dispatch(tr);
                        }
                    };

                    const result = await uploadFile(file, 0, onProgress);
                    console.log('✅ Upload result:', result);

                    // 2. Remove loading node and insert actual media
                    // We need to find the position again because it might have moved
                    let nodeFound = false;
                    editor.state.doc.descendants((node, pos) => {
                        if (node.type.name === 'loadingMedia' && node.attrs.id === uploadId) {
                            nodeFound = true;

                            if (result.type === 'image' || ['audio', 'video', 'document'].includes(result.type)) {
                                editor.chain()
                                    .deleteRange({ from: pos, to: pos + node.nodeSize })
                                    .insertContentAt(pos, [
                                        {
                                            type: 'media',
                                            attrs: {
                                                ...result,
                                                width: (result.type === 'image' || result.type === 'video') ? '30%' : undefined
                                            }
                                        },
                                        { type: 'paragraph' }
                                    ])
                                    .run();
                            } else {
                                editor.chain()
                                    .deleteRange({ from: pos, to: pos + node.nodeSize })
                                    .insertContentAt(pos, [
                                        {
                                            type: 'text',
                                            text: result.name,
                                            marks: [{ type: 'link', attrs: { href: result.url } }]
                                        },
                                        { type: 'text', text: ' ' }
                                    ])
                                    .run();
                            }
                            return false;
                        }
                    });

                } catch (error: any) {
                    console.error('❌ Upload/Insertion error:', error);
                    // Remove loading node on error
                    editor.state.doc.descendants((node, pos) => {
                        if (node.type.name === 'loadingMedia' && node.attrs.id === uploadId) {
                            editor.commands.deleteRange({ from: pos, to: pos + node.nodeSize });
                            return false;
                        }
                    });
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

        const focusAtEndWithNewLine = () => {
            if (!editor) return;

            // 1. Focus at the very end
            editor.commands.focus('end');

            // 2. Check if the last node is already an empty paragraph
            const { state } = editor;
            const lastNode = state.doc.lastChild;
            const isLastNodeEmptyParagraph = lastNode?.type.name === 'paragraph' && lastNode.content.size === 0;

            if (!isLastNodeEmptyParagraph) {
                // Insert a new paragraph if the last one isn't empty
                editor.chain()
                    .insertContentAt(state.doc.content.size, { type: 'paragraph' })
                    .focus('end')
                    .run();
            }
        };

        useImperativeHandle(ref, () => ({
            uploadFiles,
            insertLink: handleOpenLinkPopover,
            focus: focusAtEndWithNewLine,
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
            <div
                className="border rounded-md bg-white overflow-hidden flex flex-col min-h-[200px]"
                onClick={() => {
                    if (!editor.isFocused) {
                        focusAtEndWithNewLine();
                    }
                }}
            >
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
