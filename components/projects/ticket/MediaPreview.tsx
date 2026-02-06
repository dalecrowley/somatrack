'use client';

import { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Button } from '@/components/ui/button';
import { Play, Pause, Maximize2, FileText, ImageIcon, Music, Video } from 'lucide-react';
import { Attachment } from '@/types';

interface MediaPreviewProps {
    attachment: Attachment;
}

export function MediaPreview({ attachment }: MediaPreviewProps) {
    const waveformRef = useRef<HTMLDivElement>(null);
    const wavesurfer = useRef<WaveSurfer | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        if (attachment.type === 'audio' && waveformRef.current) {
            wavesurfer.current = WaveSurfer.create({
                container: waveformRef.current,
                waveColor: '#4f46e5',
                progressColor: '#818cf8',
                cursorColor: '#4f46e5',
                barWidth: 2,
                barRadius: 3,
                height: 40,
                url: attachment.boxSharedLink || attachment.url,
            });

            wavesurfer.current.on('play', () => setIsPlaying(true));
            wavesurfer.current.on('pause', () => setIsPlaying(false));
            wavesurfer.current.on('finish', () => setIsPlaying(false));

            return () => {
                wavesurfer.current?.destroy();
            };
        }
    }, [attachment]);

    const togglePlay = () => {
        wavesurfer.current?.playPause();
    };

    if (attachment.type === 'image') {
        return (
            <div className="relative group rounded-md overflow-hidden border bg-muted/50 aspect-video flex items-center justify-center">
                <img
                    src={attachment.boxSharedLink || attachment.url}
                    alt={attachment.name}
                    className="max-h-full max-w-full object-contain"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button variant="secondary" size="sm" asChild>
                        <a href={attachment.boxSharedLink || attachment.url} target="_blank" rel="noopener noreferrer">
                            <Maximize2 className="h-4 w-4 mr-2" />
                            View Full
                        </a>
                    </Button>
                </div>
            </div>
        );
    }

    if (attachment.type === 'video') {
        return (
            <div className="rounded-md overflow-hidden border bg-black aspect-video flex items-center justify-center">
                <video
                    src={attachment.boxSharedLink || attachment.url}
                    controls
                    className="max-h-full max-w-full"
                    poster="" // Optional: Add a poster if we can generate thumbnails
                />
            </div>
        );
    }

    if (attachment.type === 'audio') {
        return (
            <div className="p-3 border rounded-md bg-card flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <Music className="h-4 w-4 text-indigo-500 shrink-0" />
                        <span className="text-sm font-medium truncate">{attachment.name}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={togglePlay}>
                        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                </div>
                <div ref={waveformRef} className="w-full" />
            </div>
        );
    }

    return (
        <div className="flex items-center gap-3 p-3 border rounded-md bg-card">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium truncate">{attachment.name}</p>
                <p className="text-xs text-muted-foreground uppercase">{attachment.type}</p>
            </div>
            <Button variant="outline" size="sm" asChild>
                <a href={attachment.boxSharedLink || attachment.url} target="_blank" rel="noopener noreferrer">
                    Open
                </a>
            </Button>
        </div>
    );
}
