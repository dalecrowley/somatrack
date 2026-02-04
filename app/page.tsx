'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log('Home page effect. Loading:', loading, 'User:', user?.email);
    if (!loading) {
      if (user) {
        console.log('Home page: Authenticated, redirecting to /clients');
        // Redirect authenticated users to clients page
        router.push('/clients');
      } else {
        console.log('Home page: Not authenticated, redirecting to /login');
        // Redirect unauthenticated users to login
        router.push('/login');
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return null;
}
