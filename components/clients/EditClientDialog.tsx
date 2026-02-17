'use client';

import { useState, useEffect } from 'react';
import { Client } from '@/types';
import { useClients } from '@/hooks/useClients';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useRef } from 'react';
import { ImagePlus, X, Loader2 } from 'lucide-react';

interface EditClientDialogProps {
    client: Client | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function EditClientDialog({ client, open, onOpenChange }: EditClientDialogProps) {
    const { editClient } = useClients();
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [useDarkBackground, setUseDarkBackground] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (client) {
            setName(client.name);
            setLogoPreview(client.logoUrl || null);
            setUseDarkBackground(client.logoUseDarkBackground || false);
            setLogoFile(null);
        }
    }, [client, open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!client || !name.trim()) return;

        setLoading(true);
        try {
            let logoUrl = client.logoUrl || '';

            // Upload logo to Box if a NEW file is selected
            if (logoFile) {
                // 1. Get routing folder for images
                const folderRes = await fetch('/api/box/folder', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fileName: logoFile.name, mimeType: logoFile.type })
                });
                const { folderId } = await folderRes.json();

                // 2. Upload the file
                const formData = new FormData();
                formData.append('file', logoFile);
                formData.append('folderId', folderId || '0');

                const uploadRes = await fetch('/api/box/upload', {
                    method: 'POST',
                    body: formData
                });

                if (!uploadRes.ok) throw new Error('Box upload failed');

                const { id } = await uploadRes.json();
                // Store the proxy URL as the logoUrl
                logoUrl = `/api/box/content/${id}`;
            } else if (!logoPreview) {
                // Logo was explicitly removed
                logoUrl = '';
            }

            const success = await editClient(client.id, {
                name,
                logoUrl,
                logoUseDarkBackground: useDarkBackground
            });
            if (success) {
                onOpenChange(false);
            }
        } catch (error) {
            console.error('Failed to update client with logo:', error);
        } finally {
            setLoading(false);
        }
    };

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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <Form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Rename Client</DialogTitle>
                        <DialogDescription>
                            Update the name of the client organization.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-6 py-6">
                        <div className="flex flex-col items-center gap-4">
                            <Label htmlFor="edit-logo-upload" className="text-sm font-medium cursor-pointer hover:text-primary transition-colors">
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
                                            className="h-full w-full object-contain p-2"
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
                                id="edit-logo-upload"
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleFileChange}
                            />
                            <div className="flex items-center space-x-2 pt-2">
                                <Checkbox
                                    id="edit-dark-bg"
                                    checked={useDarkBackground}
                                    onCheckedChange={(checked) => setUseDarkBackground(checked as boolean)}
                                />
                                <Label
                                    htmlFor="edit-dark-bg"
                                    className="text-xs font-normal text-muted-foreground cursor-pointer"
                                >
                                    Use dark background for logo
                                </Label>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-name">Client Name</Label>
                            <Input
                                id="edit-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                autoFocus
                                required
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading || !name.trim()} className="w-full">
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function Form({ children, onSubmit }: { children: React.ReactNode; onSubmit: (e: React.FormEvent) => void }) {
    return <form onSubmit={onSubmit}>{children}</form>;
}
