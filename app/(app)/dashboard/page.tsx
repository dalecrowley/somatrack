'use client';

import Image from 'next/image';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DashboardPage() {
    const user = useAuthStore((state) => state.user);

    return (
        <div className="container space-y-8 py-8">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
                <Image
                    src="/Somatrackblack.png"
                    alt="SomaTrack Logo"
                    width={600}
                    height={300}
                    className="max-w-full h-auto rounded-lg shadow-lg"
                    priority
                />
                <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mt-4">
                    SomaTrack Dashboard
                </h1>
                <p className="text-xl text-muted-foreground">
                    Audio/SFX Project Management for Somatone
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
