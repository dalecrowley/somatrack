'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { useIsAdmin } from '@/hooks/useAuth';

export default function Sidebar() {
    const pathname = usePathname();
    const isAdmin = useIsAdmin();
    const user = useAuthStore((state) => state.user);

    if (!user) return null; // Don't show sidebar if not logged in

    const navItems = [
        { name: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
        { name: 'Clients', href: '/clients', icon: 'folder_open' },
    ];

    if (isAdmin) {
        navItems.push({ name: 'Admin', href: '/admin', icon: 'admin_panel_settings' });
    }

    return (
        <aside className="h-screen w-64 fixed left-0 top-0 z-40 bg-blue-50/50 dark:bg-slate-900/80 backdrop-blur-xl flex flex-col py-6 font-['Inter'] antialiased tracking-tight border-r border-blue-100/50">
            <div className="px-6 mb-8 flex items-center gap-3">
                <Link href="/dashboard" className="flex items-center gap-3 cursor-pointer">
                    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                        <span className="material-symbols-outlined text-white text-sm">auto_awesome</span>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-none">SomaTrack</h1>
                        <p className="text-[10px] uppercase tracking-widest text-primary font-bold mt-1">Enterprise Workspace</p>
                    </div>
                </Link>
            </div>
            
            <div className="flex-1 space-y-1 mt-4">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                        <Link 
                            key={item.href}
                            href={item.href}
                            className={
                                isActive 
                                    ? "flex items-center gap-3 px-6 py-2.5 text-primary dark:text-white font-semibold border-l-4 border-primary dark:border-slate-200 bg-primary/10 dark:bg-slate-800/50 transition-transform"
                                    : "flex items-center gap-3 px-6 py-2.5 text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/30 transition-colors"
                            }
                        >
                            <span className="material-symbols-outlined">{item.icon}</span>
                            <span className="text-sm font-medium">{item.name}</span>
                        </Link>
                    );
                })}
            </div>
            
            <div className="px-6 mt-4">
                {/* Placeholder for project creation or other global actions from design */}
            </div>
            
            <div className="mt-auto space-y-1 pt-6 border-t border-blue-200/30">
                <Link href="/settings" className="flex items-center gap-3 px-6 py-2 text-slate-500 dark:text-slate-400 hover:text-primary transition-colors">
                    <span className="material-symbols-outlined">settings</span>
                    <span className="text-sm font-medium">Settings</span>
                </Link>
            </div>
        </aside>
    );
}
