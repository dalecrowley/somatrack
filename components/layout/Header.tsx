'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { signOut } from '@/lib/firebase/auth';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import MagicBoxDialog from '@/components/time-tracking/MagicBoxDialog';
import { ProfileDialog } from './ProfileDialog';

export default function Header() {
    const user = useAuthStore((state) => state.user);
    const router = useRouter();
    const pathname = usePathname();
    const [magicBoxOpen, setMagicBoxOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);

    const handleSignOut = async () => {
        try {
            await signOut();
            router.push('/login');
        } catch (error) {
            console.error('Failed to sign out', error);
        }
    };

    const getUserInitials = () => {
        if (!user?.displayName) return 'ST';
        return user.displayName
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    if (!user) return null;

    // Optional page-specific navigation
    let topNavLinks = (
        <nav className="hidden md:flex gap-6 h-full items-center ml-8 text-sm">
            {/* Contextual links based on page can go here, using Atrium styling */}
            {/* e.g., <a className="text-primary dark:text-white border-b-2 border-primary dark:border-slate-200 py-5">Board</a> */}
        </nav>
    );

    return (
        <>
            <header className="fixed top-0 right-0 left-64 h-16 z-30 bg-white/80 dark:bg-slate-950 backdrop-blur-md flex justify-between items-center px-8 border-b border-blue-100/50 font-['Inter'] font-medium">
                <div className="flex items-center gap-8 h-full">
                    {/* Search Bar - Placeholder */}
                    <div className="relative group flex items-center">
                        <span className="material-symbols-outlined absolute left-3 text-slate-400 pointer-events-none">search</span>
                        <input 
                            className="pl-10 pr-4 py-1.5 bg-slate-100/80 rounded-full border-none focus:ring-2 focus:ring-primary/20 w-64 text-sm transition-all text-slate-800" 
                            placeholder="Search projects..." 
                            type="text" 
                        />
                    </div>
                    {topNavLinks}
                </div>
                
                <div className="flex items-center gap-4">
                    <button 
                        className="px-4 py-1.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all shadow-sm flex items-center gap-2"
                        onClick={() => setMagicBoxOpen(true)}
                        title="Log time to Google Sheets"
                    >
                        <span className="material-symbols-outlined text-[18px]">schedule</span>
                        Log Time
                    </button>
                    
                    <div className="flex items-center gap-2">
                        <button className="flex items-center justify-center w-8 h-8 text-slate-500 hover:bg-blue-50 hover:text-primary rounded-lg transition-colors">
                            <span className="material-symbols-outlined text-[20px]">notifications</span>
                        </button>
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="w-8 h-8 rounded-full overflow-hidden bg-slate-200 border-2 border-primary/20 hover:border-primary/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20">
                                <Avatar className="h-full w-full">
                                    <AvatarImage src={user.photoURL || ''} alt={user.displayName || ''} />
                                    <AvatarFallback className="text-xs bg-slate-200 text-slate-700">{getUserInitials()}</AvatarFallback>
                                </Avatar>
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56" align="end" forceMount>
                            <DropdownMenuLabel className="font-normal">
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-medium leading-none">{user.displayName}</p>
                                    <p className="text-xs leading-none text-muted-foreground">
                                        {user.email}
                                    </p>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setProfileOpen(true)} className="cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                                Profile Settings
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleSignOut} className="text-error focus:text-error focus:bg-error-container/50 cursor-pointer">
                                Sign out
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>

            <MagicBoxDialog open={magicBoxOpen} onOpenChange={setMagicBoxOpen} />
            <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
        </>
    );
}
