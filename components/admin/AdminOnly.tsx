"use client";

import { useIsAdmin } from '@/hooks/useAuth';
import { ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

export const AdminOnly = ({ children }: Props) => {
    const isAdmin = useIsAdmin();
    if (!isAdmin) return null;
    return <>{children}</>;
};
