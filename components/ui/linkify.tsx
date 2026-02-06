'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface LinkifyProps {
    text: string;
    className?: string;
}

export function Linkify({ text, className }: LinkifyProps) {
    if (!text) return null;

    // Regular expression to match URLs
    const urlPattern = /(https?:\/\/[^\s]+)/g;

    // Split the text by the pattern and map through it
    const parts = text.split(urlPattern);

    return (
        <span className={cn("break-words", className)}>
            {parts.map((part, index) => {
                if (part.match(urlPattern)) {
                    return (
                        <a
                            key={index}
                            href={part}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {part}
                        </a>
                    );
                }
                return <React.Fragment key={index}>{part}</React.Fragment>;
            })}
        </span>
    );
}
