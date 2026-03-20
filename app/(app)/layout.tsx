import AuthGuard from '@/components/auth/AuthGuard';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';

export default function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AuthGuard>
            <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 font-['Inter'] text-on-surface antialiased">
                <Sidebar />
                <Header />
                <main className="ml-64 pt-16 min-h-screen transition-all">
                    {children}
                </main>
            </div>
        </AuthGuard>
    );
}
