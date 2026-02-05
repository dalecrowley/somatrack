'use client';

import { useState, useEffect } from 'react';
import { Project, ProjectStatus, Swimlane } from '@/types';
import { useProject } from '@/hooks/useProject';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProjectSettingsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    projectId: string;
}

export function ProjectSettingsDialog({ open, onOpenChange, projectId }: ProjectSettingsDialogProps) {
    const { project, updateProject } = useProject(projectId);
    const [statuses, setStatuses] = useState<ProjectStatus[]>([]);
    const [swimlanes, setSwimlanes] = useState<Swimlane[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (project) {
            setStatuses(project.statuses || []);
            setSwimlanes(project.swimlanes || []);
        }
    }, [project, open]);

    const handleSave = async () => {
        setLoading(true);
        try {
            await updateProject({
                statuses,
                swimlanes,
            });
            onOpenChange(false);
        } catch (error) {
            console.error('Failed to save settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const addStatus = () => {
        const newStatus: ProjectStatus = {
            id: `status-${Date.now()}`,
            projectId,
            title: 'New Status',
            order: statuses.length,
            color: '#94a3b8',
        };
        setStatuses([...statuses, newStatus]);
    };

    const removeStatus = (id: string) => {
        setStatuses(statuses.filter(s => s.id !== id));
    };

    const updateStatus = (id: string, updates: Partial<ProjectStatus>) => {
        setStatuses(statuses.map(s => s.id === id ? { ...s, ...updates } : s));
    };

    const addSwimlane = () => {
        const newSwimlane: Swimlane = {
            id: `lane-${Date.now()}`,
            projectId,
            title: 'New Swimlane',
            order: swimlanes.length,
            color: '#94a3b8',
        };
        setSwimlanes([...swimlanes, newSwimlane]);
    };

    const removeSwimlane = (id: string) => {
        setSwimlanes(swimlanes.filter(s => s.id !== id));
    };

    const updateSwimlane = (id: string, updates: Partial<Swimlane>) => {
        setSwimlanes(swimlanes.map(s => s.id === id ? { ...s, ...updates } : s));
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col p-0">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle>Project Settings</DialogTitle>
                    <DialogDescription>
                        Customize your project workflow by managing statuses and swimlanes.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="statuses" className="flex-1 overflow-hidden flex flex-col">
                    <div className="px-6">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="statuses">Statuses (Columns)</TabsTrigger>
                            <TabsTrigger value="swimlanes">Swimlanes (Rows)</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="statuses" className="flex-1 overflow-y-auto mt-4 px-6 space-y-4">
                        <div className="space-y-3">
                            {statuses.map((status, index) => (
                                <div key={status.id} className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg group">
                                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
                                    <div className="flex-1 grid grid-cols-[1fr,60px] gap-3">
                                        <Input
                                            value={status.title}
                                            onChange={(e) => updateStatus(status.id, { title: e.target.value })}
                                            placeholder="Status Title"
                                        />
                                        <div className="relative h-10 w-full overflow-hidden rounded-md border">
                                            <input
                                                type="color"
                                                value={status.color || '#94a3b8'}
                                                onChange={(e) => updateStatus(status.id, { color: e.target.value })}
                                                className="absolute inset-0 h-[calc(100%+20px)] w-[calc(100%+20px)] -top-[10px] -left-[10px] cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => removeStatus(status.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                            <Button
                                variant="outline"
                                className="w-full border-dashed"
                                onClick={addStatus}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Status
                            </Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="swimlanes" className="flex-1 overflow-y-auto mt-4 px-6 space-y-4">
                        <div className="space-y-3">
                            {swimlanes.map((lane, index) => (
                                <div key={lane.id} className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg group">
                                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
                                    <div className="flex-1 grid grid-cols-[1fr,60px] gap-3">
                                        <Input
                                            value={lane.title}
                                            onChange={(e) => updateSwimlane(lane.id, { title: e.target.value })}
                                            placeholder="Swimlane Title"
                                        />
                                        <div className="relative h-10 w-full overflow-hidden rounded-md border">
                                            <input
                                                type="color"
                                                value={lane.color || '#94a3b8'}
                                                onChange={(e) => updateSwimlane(lane.id, { color: e.target.value })}
                                                className="absolute inset-0 h-[calc(100%+20px)] w-[calc(100%+20px)] -top-[10px] -left-[10px] cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => removeSwimlane(lane.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                            <Button
                                variant="outline"
                                className="w-full border-dashed"
                                onClick={addSwimlane}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Swimlane
                            </Button>
                        </div>
                    </TabsContent>
                </Tabs>

                <DialogFooter className="p-6 pt-2">
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={loading}>
                        {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
