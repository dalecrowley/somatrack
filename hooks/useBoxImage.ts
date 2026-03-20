'use client';

import { useState, useEffect } from 'react';
import { getIdToken } from '@/lib/firebase/auth';

/**
 * Append ?token= to Box proxy URLs so verifySession can auth the <img> request
 */
export function useBoxImage(rawUrl: string | Blob | null | undefined): string | Blob {
    const [tokenUrl, setTokenUrl] = useState<string | Blob>(rawUrl ?? '');

    useEffect(() => {
        if (!rawUrl) {
            setTokenUrl('');
            return;
        }

        if (rawUrl instanceof Blob) {
            setTokenUrl(rawUrl);
            return;
        }
        
        // Only Box proxy URLs need the token; external URLs (Google, etc.) don't
        if (!rawUrl.startsWith('/api/box/')) {
            setTokenUrl(rawUrl);
            return;
        }

        getIdToken()
            .then((token) => {
                setTokenUrl(token ? `${rawUrl}?token=${token}` : rawUrl);
            })
            .catch(() => setTokenUrl(rawUrl));
    }, [rawUrl]);

    return tokenUrl;
}
