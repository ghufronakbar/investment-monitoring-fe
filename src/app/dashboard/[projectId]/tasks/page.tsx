'use client';

/**
 * Contractor Tasks Page
 * Shows tasks tree with submit progress dialog on leaf tasks
 */
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useProject, useOrganization } from '@/providers';
import { queryKeys } from '@/constants';
import { getTasks, submitProgress } from '@/services';
import { getApiErrorMessage, isApiError, isValidationError } from '@/lib/api';
import type { TaskItem } from '@/types';

import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { FileUploader } from '@/components/ui/file-uploader';
import {
    ListTodo,
    Calendar,
    Weight,
    CheckCircle2,
    ChevronRight,
    ChevronDown,
    Upload,
    Camera,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Progress form schema
const progressSchema = z.object({
    progressPercentage: z.coerce.number().int().min(1).max(100, 'Progress must be between 1 and 100'),
    report: z.string().min(20, 'Report must be at least 20 characters'),
});

type ProgressFormData = z.infer<typeof progressSchema>;

export default function ContractorTasksPage() {
    const queryClient = useQueryClient();
    const { projectId } = useProject();
    const { orgRole } = useOrganization();

    const isContractor = orgRole === 'CONTRACTOR';

    // State
    const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
    const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
    const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);

    // Fetch tasks tree
    const { data, isLoading, error } = useQuery({
        queryKey: queryKeys.monitoring.tasks(projectId!),
        queryFn: () => getTasks(projectId!),
        enabled: !!projectId,
    });

    // Form
    const form = useForm<ProgressFormData>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(progressSchema as any),
        defaultValues: {
            progressPercentage: 10,
            report: '',
        },
    });

    // Submit progress mutation
    const mutation = useMutation({
        mutationFn: (data: ProgressFormData) =>
            submitProgress(selectedTask!.id, {
                progressPercentage: data.progressPercentage,
                report: data.report,
                evidenceImageUrls: evidenceUrls,
            }),
        onSuccess: () => {
            toast.success('Progress submitted successfully!');
            queryClient.invalidateQueries({ queryKey: queryKeys.monitoring.tasks(projectId!) });
            queryClient.invalidateQueries({ queryKey: queryKeys.monitoring.logs(projectId!) });
            closeDialog();
        },
        onError: (error) => {
            if (isValidationError(error)) {
                Object.entries(error.validationErrors).forEach(([field, message]) => {
                    form.setError(field as keyof ProgressFormData, { message });
                });
            } else if (isApiError(error)) {
                toast.error(getApiErrorMessage(error));
            }
        },
    });

    // Toggle expand/collapse
    const toggleExpand = (taskId: string) => {
        setExpandedTasks((prev) => {
            const next = new Set(prev);
            if (next.has(taskId)) {
                next.delete(taskId);
            } else {
                next.add(taskId);
            }
            return next;
        });
    };

    // Open dialog for submitting progress
    const openDialog = (task: TaskItem) => {
        setSelectedTask(task);
        form.reset({
            progressPercentage: 10,
            report: '',
        });
        setEvidenceUrls([]);
    };

    // Close dialog
    const closeDialog = () => {
        setSelectedTask(null);
        form.reset();
        setEvidenceUrls([]);
    };

    // Handle form submit
    const handleSubmit = (data: ProgressFormData) => {
        if (evidenceUrls.length === 0) {
            toast.error('Please upload at least one evidence image');
            return;
        }
        mutation.mutate(data);
    };

    // Expand all tasks
    const expandAll = () => {
        if (!data?.tasks) return;
        const allIds = new Set<string>();
        const collectIds = (tasks: TaskItem[]) => {
            tasks.forEach((task) => {
                if (task.children && task.children.length > 0) {
                    allIds.add(task.id);
                    collectIds(task.children);
                }
            });
        };
        collectIds(data.tasks);
        setExpandedTasks(allIds);
    };

    // Collapse all
    const collapseAll = () => {
        setExpandedTasks(new Set());
    };

    // Render task recursively
    const renderTask = (task: TaskItem, depth = 0) => {
        const hasChildren = task.children && task.children.length > 0;
        const isExpanded = expandedTasks.has(task.id);
        const isOverdue = new Date(task.deadline) < new Date() && task.actualPercentage < 100;
        const isComplete = task.actualPercentage >= 100;
        const isLeaf = task.isLeaf;

        return (
            <div key={task.id} className="select-none">
                <div
                    className={cn(
                        'flex items-center gap-2 p-3 rounded-lg border transition-colors',
                        isComplete ? 'bg-green-50 border-green-200' : 'bg-white hover:bg-slate-50',
                        isOverdue && 'border-red-200'
                    )}
                    style={{ marginLeft: depth * 24 }}
                >
                    {/* Expand/Collapse */}
                    <button
                        onClick={() => hasChildren && toggleExpand(task.id)}
                        className={cn(
                            'w-6 h-6 flex items-center justify-center rounded',
                            hasChildren ? 'hover:bg-slate-200 cursor-pointer' : 'opacity-0'
                        )}
                        disabled={!hasChildren}
                    >
                        {hasChildren && (isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />)}
                    </button>

                    {/* Task Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="font-medium">{task.title}</span>
                            {isComplete && (
                                <Badge variant="default" className="bg-green-600 text-xs">
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    Complete
                                </Badge>
                            )}
                            {isLeaf && !isComplete && (
                                <Badge variant="secondary" className="text-xs">Leaf</Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                            <span className="flex items-center gap-1">
                                <Weight className="w-3 h-3" />
                                {task.weight}%
                            </span>
                            <span className={cn('flex items-center gap-1', isOverdue && 'text-red-500')}>
                                <Calendar className="w-3 h-3" />
                                {new Date(task.deadline).toLocaleDateString()}
                            </span>
                        </div>
                    </div>

                    {/* Progress */}
                    <div className='flex flex-col items-end gap-2'>
                        <div className="flex items-center gap-4">
                            <div className="w-32 shrink-0">
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-slate-400">Progress</span>
                                    <span className="font-medium">{task.actualPercentage}%</span>
                                </div>
                                <Progress value={task.actualPercentage} className="h-2" />
                            </div>

                            {/* Claimed vs Actual */}
                            <div className="w-20 shrink-0 text-xs text-center">
                                <div className="text-slate-500">Claimed</div>
                                <div className="font-medium">{task.claimedPercentage}%</div>
                            </div>
                        </div>

                        {/* CTA for leaf tasks */}
                        {isLeaf && !isComplete && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openDialog(task)}
                                className="shrink-0"
                            >
                                <Upload className="w-4 h-4 mr-1" />
                                Submit
                            </Button>
                        )}
                    </div>
                </div>

                {/* Children */}
                {hasChildren && isExpanded && (
                    <div className="mt-1 space-y-1">
                        {task.children!.map((child) => renderTask(child, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    // Count leaf tasks
    const countLeafTasks = (tasks: TaskItem[]): { total: number; completed: number } => {
        let total = 0;
        let completed = 0;
        const count = (items: TaskItem[]) => {
            items.forEach((task) => {
                if (task.isLeaf) {
                    total++;
                    if (task.actualPercentage >= 100) completed++;
                }
                if (task.children) count(task.children);
            });
        };
        count(tasks);
        return { total, completed };
    };

    if (!isContractor) {
        return (
            <Card className="max-w-md mx-auto text-center">
                <CardHeader>
                    <CardTitle className="text-red-600">Unauthorized</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-slate-600">This page is only for contractors.</p>
                </CardContent>
            </Card>
        );
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Spinner className="w-8 h-8" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <Card className="max-w-md mx-auto text-center">
                <CardContent className="pt-6">
                    <p className="text-red-500">Failed to load tasks</p>
                </CardContent>
            </Card>
        );
    }

    const leafStats = data.tasks ? countLeafTasks(data.tasks) : { total: 0, completed: 0 };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <ListTodo className="w-6 h-6" />
                        My Tasks
                    </h1>
                    <p className="text-slate-600">Click &quot;Submit&quot; on leaf tasks to report progress</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={expandAll}>
                        Expand All
                    </Button>
                    <Button variant="outline" size="sm" onClick={collapseAll}>
                        Collapse All
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <Card>
                <CardContent className="pt-6">
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                            <p className="text-2xl font-bold">{leafStats.total}</p>
                            <p className="text-xs text-slate-500">Leaf Tasks</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-green-600">{leafStats.completed}</p>
                            <p className="text-xs text-slate-500">Completed</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-yellow-600">{leafStats.total - leafStats.completed}</p>
                            <p className="text-xs text-slate-500">In Progress</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tasks Tree */}
            <Card>
                <CardHeader>
                    <CardTitle>Work Breakdown Structure</CardTitle>
                    <CardDescription>
                        Leaf tasks (no children) can receive progress submissions
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {data.tasks && data.tasks.length > 0 ? (
                        <div className="space-y-2">
                            {data.tasks.map((task) => renderTask(task))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-slate-500">
                            <ListTodo className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                            <p>No tasks available</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Submit Progress Dialog */}
            <Dialog open={!!selectedTask} onOpenChange={(open) => !open && closeDialog()}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Submit Progress</DialogTitle>
                        <DialogDescription>
                            {selectedTask?.title} - Current: {selectedTask?.actualPercentage}%
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        {/* Progress Percentage */}
                        <div className="space-y-2">
                            <Label htmlFor="progressPercentage">Progress Percentage (1-100) *</Label>
                            <Input
                                id="progressPercentage"
                                type="number"
                                min={1}
                                max={100}
                                {...form.register('progressPercentage')}
                                disabled={mutation.isPending}
                            />
                            {form.formState.errors.progressPercentage && (
                                <p className="text-sm text-red-500">{form.formState.errors.progressPercentage.message}</p>
                            )}
                        </div>

                        {/* Report */}
                        <div className="space-y-2">
                            <Label htmlFor="report">Work Report *</Label>
                            <Textarea
                                id="report"
                                rows={3}
                                placeholder="Describe the work completed..."
                                {...form.register('report')}
                                disabled={mutation.isPending}
                            />
                            {form.formState.errors.report && (
                                <p className="text-sm text-red-500">{form.formState.errors.report.message}</p>
                            )}
                        </div>

                        {/* Evidence */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Camera className="w-4 h-4" />
                                Evidence Photos *
                            </Label>
                            <FileUploader
                                mode="multi"
                                accept="image"
                                maxFiles={5}
                                onChange={(urls) => setEvidenceUrls(urls as string[])}
                                disabled={mutation.isPending}
                                placeholder="Upload photos of completed work"
                            />
                            <p className="text-xs text-slate-500">At least 1 photo required. Max 5.</p>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-4 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={closeDialog}
                                disabled={mutation.isPending}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={mutation.isPending}>
                                {mutation.isPending ? (
                                    <>
                                        <Spinner className="w-4 h-4 mr-2" />
                                        Submitting...
                                    </>
                                ) : (
                                    'Submit Progress'
                                )}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
