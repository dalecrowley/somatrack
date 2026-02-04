import AuthGuard from '@/components/auth/AuthGuard';
import Header from '@/components/layout/Header';

export default function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AuthGuard>
            <div className="min-h-screen flex flex-col">
                <Header />
                <main className="flex-1">{children}</main>
            </div>
        </AuthGuard>
    );
}
