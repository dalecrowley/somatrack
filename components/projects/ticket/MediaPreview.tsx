'use client';

import { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Button } from '@/components/ui/button';
import { Play, Pause, FileText, ImageIcon, Music, Video } from 'lucide-react';
import { Attachment } from '@/types';

import { NodeViewWrapper } from '@tiptap/react';

interface MediaPreviewProps {
    attachment?: Attachment;
    // Tiptap specific props
    node?: any;
    updateAttributes?: (attrs: any) => void;
}

export function MediaPreview({ attachment: propAttachment, node, updateAttributes }: MediaPreviewProps) {
    const waveformRef = useRef<HTMLDivElement>(null);
    const wavesurfer = useRef<WaveSurfer | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    // If used as a Tiptap NodeView, extract data from node.attrs
    const attachment = propAttachment || (node?.attrs as Attachment);

    console.log(`🖼️ MediaPreview render [${attachment?.name || 'unknown'}]:`, {
        type: attachment?.type,
        boxFileId: attachment?.boxFileId,
        url: !!attachment?.url,
        hasNode: !!node,
        attrs: node?.attrs
    });

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

    if (!attachment) return null;

    const renderContent = () => {
        if (attachment.type === 'image' || attachment.type === 'document') {
            const imageUrl = attachment.boxFileId
                ? `/api/box/thumbnail/${attachment.boxFileId}`
                : (attachment.boxSharedLink || attachment.url);

            return (
                <div contentEditable={false} className="relative group rounded-md overflow-hidden border bg-muted/50 aspect-video flex items-center justify-center w-full max-w-2xl mx-auto my-4 select-none">
                    <img
                        src={imageUrl}
                        alt={attachment.name}
                        className="max-h-full max-w-full object-contain pointer-events-none"
                    />
                </div>
            );
        }

        if (attachment.type === 'video') {
            const videoUrl = attachment.boxFileId
                ? `/api/box/content/${attachment.boxFileId}`
                : (attachment.boxSharedLink || attachment.url);

            const posterUrl = attachment.boxFileId
                ? `/api/box/thumbnail/${attachment.boxFileId}`
                : '';

            return (
                <div contentEditable={false} className="rounded-md overflow-hidden border bg-black aspect-video flex items-center justify-center w-full max-w-2xl mx-auto my-4">
                    <video
                        src={videoUrl}
                        controls
                        className="max-h-full max-w-full"
                        poster={posterUrl}
                    />
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
            <NodeViewWrapper draggable className="media-preview-node-view border-2 border-indigo-500 bg-indigo-50/30 rounded-lg p-2 my-4 w-full block min-h-[50px]">
                {renderContent()}
            </NodeViewWrapper>
        );
    }

    return renderContent();
}
