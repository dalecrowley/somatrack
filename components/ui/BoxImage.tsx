'use client';

import * as React from 'react';
import { useBoxUrl } from '@/hooks/useBoxUrl';
import { cn } from '@/lib/utils';

interface BoxImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    fallback?: React.ReactNode;
}

/**
 * A wrapper around <img> that automatically handles authenticated requests
 * for Box-hosted images by appending the Firebase ID token.
 */
export function BoxImage({ src, className, fallback, ...props }: BoxImageProps) {
    const resolvedSrc = useBoxUrl(src);
    const [error, setError] = React.useState(false);

    // If we have an error and a fallback, show the fallback
    if ((error || !src) && fallback) {
        return <>{fallback}</>;
    }

    return (
        <img
            src={typeof resolvedSrc === 'string' ? resolvedSrc : undefined}
            className={cn(className)}
            onError={() => setError(true)}
            {...props}
        />
    );
}
