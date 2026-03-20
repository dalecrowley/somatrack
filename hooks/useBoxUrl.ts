'use client';

import { useState, useEffect } from 'react';
import { getIdToken } from '@/lib/firebase/auth';

/**
 * Append ?token= to Box proxy URLs so verifySession can auth the <img> request
 */
export function useBoxUrl(rawUrl: string | Blob | null | undefined): string {
    const [tokenUrl, setTokenUrl] = useState<string>('');

    useEffect(() => {
        let objectUrl: string | null = null;

        if (!rawUrl) {
            setTokenUrl('');
            return;
        }

        if (rawUrl instanceof Blob) {
            objectUrl = URL.createObjectURL(rawUrl);
            setTokenUrl(objectUrl);
            return () => {
                if (objectUrl) URL.revokeObjectURL(objectUrl);
            };
        }
        
        // Only Box proxy URLs need the token; external URLs (Google, etc.) don't
        if (typeof rawUrl === 'string' && !rawUrl.startsWith('/api/box/')) {
            setTokenUrl(rawUrl);
            return;
        }

        if (typeof rawUrl === 'string') {
            getIdToken()
                .then((token) => {
                    setTokenUrl(token ? `${rawUrl}?token=${token}` : rawUrl);
                })
                .catch(() => setTokenUrl(rawUrl));
        }
    }, [rawUrl]);

    return tokenUrl;
}
