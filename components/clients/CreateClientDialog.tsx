'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useClients } from '@/hooks/useClients';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus } from 'lucide-react';

import { useRef } from 'react';
import { ImagePlus, X, Loader2 } from 'lucide-react';

export function CreateClientDialog() {
    const { user } = useAuth();
    const { addClient } = useClients();
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [useDarkBackground, setUseDarkBackground] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setLogoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveLogo = () => {
        setLogoFile(null);
        setLogoPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !user) return;

        setLoading(true);
        setError(null);
        try {
            let logoUrl = '';

            // Upload logo to Box if present
            if (logoFile) {
                // 1. Get routing folder for images
                const folderRes = await fetch('/api/box/folder', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fileName: logoFile.name, mimeType: logoFile.type })
                });
                const { folderId } = await folderRes.json();

                // 2. Upload the file with a unique name to avoid collisions in the shared image folder
                const ext = logoFile.name.split('.').pop();
                const uniqueName = `logo_${Date.now()}.${ext}`;
                const renamedFile = new File([logoFile], uniqueName, { type: logoFile.type });
                const formData = new FormData();
                formData.append('file', renamedFile);
                formData.append('folderId', folderId || '0');

                const uploadRes = await fetch('/api/box/upload', {
                    method: 'POST',
                    body: formData
                });

                if (!uploadRes.ok) {
                    const errBody = await uploadRes.json().catch(() => ({}));
                    throw new Error(errBody.details || errBody.error || 'Box upload failed');
                }

                const { id } = await uploadRes.json();
                // Store the proxy URL as the logoUrl
                logoUrl = `/api/box/content/${id}`;
            }

            const success = await addClient(name, user.uid, logoUrl, useDarkBackground);
            if (success) {
                setOpen(false);
                setName('');
                setLogoFile(null);
                setLogoPreview(null);
                setUseDarkBackground(false);
                setError(null);
            }
        } catch (err: any) {
            console.error('Failed to create client with logo:', err);
            setError(err.message || 'Failed to create client. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Client
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <Form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Add New Client</DialogTitle>
                        <DialogDescription>
                            Create a new client organization to manage their projects.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-6 py-6">
                        <div className="flex flex-col items-center gap-4">
                            <Label htmlFor="logo-upload" className="text-sm font-medium cursor-pointer hover:text-primary transition-colors">
                                Client Logo
                            </Label>
                            <div className="relative group">
                                <div
                                    className={`h-24 w-24 rounded-xl border-2 border-dashed border-muted-foreground/20 flex items-center justify-center cursor-pointer overflow-hidden hover:border-primary/50 transition-all ${useDarkBackground ? 'bg-zinc-900 border-zinc-800' : 'bg-muted/30'
                                        }`}
                                    onClick={() => fileInputRef.current?.click()}
                                    role="button"
                                    aria-label="Upload client logo"
                                >
                                    {logoPreview ? (
                                        <img
                                            src={logoPreview}
                                            alt="Logo preview"
                                            className={`h-full w-full object-contain p-2 ${useDarkBackground ? '' : ''}`}
                                        />
                                    ) : (
                                        <div className={`flex flex-col items-center gap-1 ${useDarkBackground ? 'text-zinc-500' : 'text-muted-foreground'}`}>
                                            <ImagePlus className="h-6 w-6" />
                                            <span className="text-[10px]">Upload</span>
                                        </div>
                                    )}
                                </div>
                                {logoPreview && (
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="icon"
                                        className="h-6 w-6 rounded-full absolute -top-2 -right-2 shadow-sm"
                                        onClick={handleRemoveLogo}
                                        aria-label="Remove logo"
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                )}
                            </div>
                            <input
                                id="logo-upload"
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleFileChange}
                            />
                            <div className="flex items-center space-x-2 pt-2">
                                <Checkbox
                                    id="dark-bg"
                                    checked={useDarkBackground}
                                    onCheckedChange={(checked) => setUseDarkBackground(checked as boolean)}
                                />
                                <Label
                                    htmlFor="dark-bg"
                                    className="text-xs font-normal text-muted-foreground cursor-pointer"
                                >
                                    Use dark background for logo
                                </Label>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="name">Client Name</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Capture Age"
                                autoFocus
                                required
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        {error && (
                            <p className="text-sm text-destructive w-full text-center mb-2">{error}</p>
                        )}
                        <Button type="submit" disabled={loading || !name.trim()} className="w-full">
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating...
                                </>
                            ) : 'Create Client'}
                        </Button>
                    </DialogFooter>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

// Helper to keep the form logic clean
function Form({ children, onSubmit }: { children: React.ReactNode; onSubmit: (e: React.FormEvent) => void }) {
    return <form onSubmit={onSubmit}>{children}</form>;
}
