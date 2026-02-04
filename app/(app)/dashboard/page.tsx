'use client';

import { useAuthStore } from '@/lib/store/useAuthStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DashboardPage() {
    const user = useAuthStore((state) => state.user);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle>Welcome back!</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">
                            You are logged in as <span className="font-medium text-foreground">{user?.displayName}</span>
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
