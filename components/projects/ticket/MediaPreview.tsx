import { useEffect, useRef, useState, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Button } from '@/components/ui/button';
import { Play, Pause, FileText, ImageIcon, Music, Video, ExternalLink, Trash2 } from 'lucide-react';
import { Attachment } from '@/types';
import { NodeViewWrapper } from '@tiptap/react';
import { cn } from '@/lib/utils';

interface MediaPreviewProps {
    attachment?: Attachment;
    // Tiptap specific props
    node?: any;
    updateAttributes?: (attrs: any) => void;
    deleteNode?: () => void;
    selected?: boolean;
}

export function MediaPreview({ attachment: propAttachment, node, updateAttributes, deleteNode, selected }: MediaPreviewProps) {
    const waveformRef = useRef<HTMLDivElement>(null);
    const wavesurfer = useRef<WaveSurfer | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    // Resizing state
    const [isResizing, setIsResizing] = useState(false);
    const [aspectRatio, setAspectRatio] = useState(16 / 9);
    const containerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);

    // If used as a Tiptap NodeView, extract data from node.attrs
    const attachment = propAttachment || (node?.attrs as Attachment);
    const width = node?.attrs?.width || '100%';

    useEffect(() => {
        if (!attachment) return;
        if (attachment.type === 'audio' && waveformRef.current) {
            const audioUrl = attachment.boxFileId
                ? `/api/box/content/${attachment.boxFileId}`
                : (attachment.boxSharedLink || attachment.url);

            wavesurfer.current = WaveSurfer.create({
                container: waveformRef.current,
                waveColor: '#4f46e5',
                progressColor: '#818cf8',
                cursorColor: '#4f46e5',
                barWidth: 2,
                barRadius: 3,
                height: 40,
                url: audioUrl,
            });

            wavesurfer.current.on('play', () => setIsPlaying(true));
            wavesurfer.current.on('pause', () => setIsPlaying(false));
            wavesurfer.current.on('finish', () => setIsPlaying(false));

            return () => {
                wavesurfer.current?.destroy();
            };
        }
    }, [attachment?.boxFileId, attachment?.boxSharedLink, attachment?.url, attachment?.type]);

    const togglePlay = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        wavesurfer.current?.playPause();
    };

    // Resizing logic
    const handleResizeStart = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsResizing(true);

        const startX = e.clientX;
        const startWidth = containerRef.current?.offsetWidth || 0;
        const parentWidth = (containerRef.current?.parentElement?.offsetWidth || 1);

        const onMouseMove = (moveEvent: MouseEvent) => {
            const currentX = moveEvent.clientX;
            const diffX = currentX - startX;
            const newWidthPx = Math.max(100, startWidth + diffX);
            const newWidthPercent = (newWidthPx / parentWidth) * 100;

            if (containerRef.current) {
                containerRef.current.style.width = `${Math.min(100, newWidthPercent)}%`;
            }
        };

        const onMouseUp = () => {
            setIsResizing(false);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);

            if (updateAttributes && containerRef.current) {
                updateAttributes({
                    width: containerRef.current.style.width
                });
            }
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    }, [updateAttributes]);

    if (!attachment) return null;

    const renderContent = () => {
        const isInteractive = attachment.type === 'image' || attachment.type === 'video';

        if (attachment.type === 'image' || attachment.type === 'document' || attachment.type === 'video') {
            const displayUrl = (attachment.type === 'image' || attachment.type === 'video') && attachment.boxFileId
                ? `/api/box/content/${attachment.boxFileId}`
                : attachment.boxFileId
                    ? `/api/box/thumbnail/${attachment.boxFileId}`
                    : (attachment.boxSharedLink || attachment.url);

            const posterUrl = attachment.boxFileId && attachment.type === 'video'
                ? `/api/box/thumbnail/${attachment.boxFileId}`
                : '';

            return (
                <div
                    ref={containerRef}
                    contentEditable={false}
                    className={cn(
                        "relative group rounded-md overflow-visible border bg-muted/50 flex flex-col items-center justify-center mx-auto my-4 select-none transition-shadow",
                        (selected || isResizing) ? "max-h-[60vh]" : "max-h-[20vh]",
                        selected && "ring-2 ring-primary shadow-lg",
                        isResizing && "cursor-nwse-resize"
                    )}
                    style={{ width: width }}
                >
                    {/* Media content */}
                    {attachment.type === 'video' ? (
                        <video
                            src={displayUrl}
                            controls={!isResizing}
                            className={cn(
                                "w-full h-auto rounded-md object-contain",
                                (selected || isResizing) ? "max-h-[60vh]" : "max-h-[20vh]"
                            )}
                            poster={posterUrl}
                        />
                    ) : (
                        <img
                            ref={imageRef}
                            src={displayUrl}
                            alt={attachment.name}
                            className={cn(
                                "w-full h-auto rounded-md object-contain pointer-events-none",
                                (selected || isResizing) ? "max-h-[60vh]" : "max-h-[20vh]"
                            )}
                            onLoad={(e) => {
                                const img = e.target as HTMLImageElement;
                                setAspectRatio(img.naturalWidth / img.naturalHeight);
                            }}
                        />
                    )}

                    {/* Resize Handles - visible when selected OR resizing */}
                    {node && (selected || isResizing) && isInteractive && (
                        <>
                            <div
                                className="absolute -bottom-1 -right-1 w-3 h-3 bg-primary border border-white rounded-sm cursor-nwse-resize z-50 shadow-sm"
                                onMouseDown={handleResizeStart}
                            />
                            <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-primary border border-white rounded-sm cursor-nesw-resize z-50 shadow-sm opacity-50 pointer-events-none" />
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary border border-white rounded-sm cursor-nesw-resize z-50 shadow-sm opacity-50 pointer-events-none" />
                            <div className="absolute -top-1 -left-1 w-3 h-3 bg-primary border border-white rounded-sm cursor-nwse-resize z-50 shadow-sm opacity-50 pointer-events-none" />
                        </>
                    )}

                    {/* Action Toolbar */}
                    {node && selected && (
                        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 bg-white dark:bg-zinc-900 border shadow-md rounded-md p-1 flex items-center gap-1 z-[60] animate-in fade-in slide-in-from-top-2 duration-200">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-muted"
                                onClick={() => window.open(attachment.boxSharedLink || attachment.url, '_blank')}
                                title="Open in Box"
                            >
                                <ExternalLink className="h-4 w-4" />
                            </Button>
                            <div className="w-px h-4 bg-border mx-0.5" />
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                onClick={deleteNode}
                                title="Delete"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </div>
            );
        }

        if (attachment.type === 'audio') {
            return (
                <div contentEditable={false} className="p-3 border rounded-md bg-card flex flex-col gap-2 my-4 w-full max-w-xl mx-auto shadow-sm select-none border-indigo-100">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 overflow-hidden">
                            <Music className="h-4 w-4 text-indigo-500 shrink-0" />
                            <span className="text-sm font-medium truncate">{attachment.name}</span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={togglePlay} type="button">
                            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                    </div>
                    <div ref={waveformRef} className="w-full h-10 bg-muted/20 rounded" />
                </div>
            );
        }

        return (
            <div contentEditable={false} className="flex items-center gap-3 p-3 border rounded-md bg-card my-2 w-full max-w-md mx-auto select-none border-dashed">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-medium truncate">{attachment.name}</p>
                    <p className="text-xs text-muted-foreground uppercase">{attachment.type}</p>
                </div>
            </div>
        );
    };

    // If node is present, we are in Tiptap, wrap in NodeViewWrapper
    if (node) {
        return (
            <NodeViewWrapper draggable className="media-preview-node-view border-0 my-4 w-full block min-h-[50px]">
                {renderContent()}
            </NodeViewWrapper>
        );
    }

    return renderContent();
}
