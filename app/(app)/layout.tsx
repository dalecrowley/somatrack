import AuthGuard from '@/components/auth/AuthGuard';
import Header from '@/components/layout/Header';

export default function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AuthGuard>
            <div className="min-h-screen bg-background">
                <Header />
                <main className="container py-6">{children}</main>
            </div>
        </AuthGuard>
    );
}
