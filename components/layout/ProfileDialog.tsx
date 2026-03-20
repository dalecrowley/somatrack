'use client';

import { useState, useRef } from 'react';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '@/lib/firebase/config';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Upload, X, Loader2 } from 'lucide-react';

interface ProfileDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ProfileDialog({ open, onOpenChange }: ProfileDialogProps) {
    const user = useAuthStore((state) => state.user);
    const setUser = useAuthStore((state) => state.setUser);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const getUserInitials = () => {
        if (!user?.displayName) return 'ST';
        return user.displayName
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        try {
            setUploading(true);
            
            // Upload to Firebase Storage
            const storageRef = ref(storage, `avatars/${user.uid}/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);

            // Update Auth Profile
            if (auth.currentUser) {
                await updateProfile(auth.currentUser, { photoURL: downloadURL });
            }

            // Update Firestore User Document
            await updateDoc(doc(db, 'users', user.uid), {
                photoURL: downloadURL
            });

            // Update Zustand Store
            setUser({
                ...user,
                photoURL: downloadURL
            } as any);

        } catch (error) {
            console.error('Error uploading avatar:', error);
            alert('Failed to upload image. Please try again.');
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleRemoveAvatar = async () => {
        if (!user) return;
        
        try {
            setUploading(true);
            
            // Update Auth Profile
            if (auth.currentUser) {
                await updateProfile(auth.currentUser, { photoURL: null });
            }

            // Update Firestore User Document
            await updateDoc(doc(db, 'users', user.uid), {
                photoURL: null
            });

            // Update Zustand Store
            setUser({
                ...user,
                photoURL: null
            } as any);
            
        } catch (error) {
            console.error('Error removing avatar:', error);
            alert('Failed to remove avatar.');
        } finally {
            setUploading(false);
        }
    };

    if (!user) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] bg-surface dark:bg-slate-900 border-outline-variant/20 rounded-2xl shadow-xl font-['Inter']">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-primary dark:text-white">Profile Settings</DialogTitle>
                    <DialogDescription className="text-on-surface-variant">
                        Manage your account settings and update your avatar.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col items-center gap-6 py-6">
                    <div className="relative group">
                        <Avatar className="h-32 w-32 border-4 border-white dark:border-slate-800 shadow-md">
                            <AvatarImage src={user.photoURL || ''} alt={user.displayName || ''} className="object-cover" />
                            <AvatarFallback className="text-4xl bg-primary/10 text-primary font-bold">
                                {getUserInitials()}
                            </AvatarFallback>
                        </Avatar>
                        
                        {uploading && (
                            <div className="absolute inset-0 bg-white/50 dark:bg-black/50 rounded-full flex items-center justify-center backdrop-blur-[2px]">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        )}
                        
                        <div className="absolute -bottom-2 -right-2 flex gap-2">
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className="h-10 w-10 bg-primary text-white rounded-full flex items-center justify-center shadow-lg hover:bg-primary/90 transition-all hover:scale-105 disabled:opacity-50"
                                title="Upload new image"
                            >
                                <Upload className="h-4 w-4" />
                            </button>
                            {user.photoURL && (
                                <button 
                                    onClick={handleRemoveAvatar}
                                    disabled={uploading}
                                    className="h-10 w-10 bg-surface-container-highest text-error rounded-full flex items-center justify-center shadow-lg hover:bg-error-container transition-all hover:scale-105 disabled:opacity-50 border border-white dark:border-slate-800"
                                    title="Remove image"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                        <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            ref={fileInputRef} 
                            onChange={handleFileSelect} 
                        />
                    </div>
                    
                    <div className="text-center">
                        <h3 className="text-lg font-bold text-primary dark:text-white">{user.displayName}</h3>
                        <p className="text-sm text-on-surface-variant">{user.email}</p>
                    </div>
                </div>

                <DialogFooter className="border-t border-outline-variant/10 pt-4">
                    <Button onClick={() => onOpenChange(false)} className="w-full bg-surface-container-highest text-on-surface-variant hover:bg-surface-variant font-bold rounded-xl" variant="ghost">
                        Done
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
