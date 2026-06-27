'use client';

/**
 * WBS Tasks Tree View Page
 * Displays task hierarchy with progress percentages
 * For GOV_SUPERVISOR and EXECUTING_AGENCY
 */
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useProject, useOrganization } from '@/providers';
import { invalidationMap, queryKeys } from '@/constants';
import { getTasks, createTask, deleteTask, getWBSValidation } from '@/services';
import { isApiError, isValidationError } from '@/lib/api';
import { getWBSErrorMessage, getWBSWeightWarning } from '@/lib/wbs';
import type { TaskItem } from '@/types';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
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
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    ListTodo,
    Plus,
    ChevronRight,
    ChevronDown,
    Edit,
    Trash2,
    Calendar,
    Weight,
    CheckCircle2,
    AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// Task form schema
const taskSchema = z.object({
    title: z.string().min(3, 'Title must be at least 3 characters'),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    deadline: z.string().min(1, 'Deadline is required'),
    weight: z.coerce.number().int().min(1).max(100, 'Weight must be between 1 and 100'),
});

type TaskFormData = z.infer<typeof taskSchema>;

export default function TasksPage() {
    const { projectId } = useProject();
    const { orgRole, isAdmin } = useOrganization();
    const queryClient = useQueryClient();

    const canEdit = orgRole === 'EXECUTING_AGENCY' && isAdmin;

    // States
    const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
    const [deleteTarget, setDeleteTarget] = useState<TaskItem | null>(null);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [parentTask, setParentTask] = useState<TaskItem | null>(null);

    // Form
    const form = useForm<TaskFormData>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(taskSchema as any),
        defaultValues: {
            title: '',
            description: '',
            deadline: '',
            weight: 10,
        },
    });

    // Fetch tasks
    const { data, isLoading, error } = useQuery({
        queryKey: queryKeys.monitoring.tasks(projectId!),
        queryFn: () => getTasks(projectId!),
        enabled: !!projectId,
    });

    const { data: wbsValidation } = useQuery({
        queryKey: queryKeys.tasks.validation(projectId!),
        queryFn: () => getWBSValidation(projectId!),
        enabled: !!projectId,
    });

    const watchedWeight = Number(form.watch('weight')) || 0;
    const createWeightWarning = data?.tasks
        ? getWBSWeightWarning({
            tasks: data.tasks,
            weight: watchedWeight,
            parentId: parentTask?.id ?? null,
        })
        : null;

    // Create task mutation
    const createMutation = useMutation({
        mutationFn: (data: TaskFormData) =>
            createTask(projectId!, {
                title: data.title,
                description: data.description,
                deadline: new Date(data.deadline).toISOString(),
                weight: data.weight,
                parentId: parentTask?.id || null,
            }),
        onSuccess: () => {
            toast.success(parentTask ? 'Subtask created successfully!' : 'Task created successfully!');
            invalidationMap.task(projectId!).forEach((key) => {
                queryClient.invalidateQueries({ queryKey: key });
            });
            closeCreateDialog();
        },
        onError: (error) => {
            if (isValidationError(error)) {
                Object.entries(error.validationErrors).forEach(([field, message]) => {
                    form.setError(field as keyof TaskFormData, { message });
                });
            } else if (isApiError(error)) {
                toast.error(getWBSErrorMessage(error.responseMessage));
            }
        },
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (taskId: string) => deleteTask(taskId),
        onSuccess: () => {
            toast.success('Task deleted successfully');
            invalidationMap.task(projectId!).forEach((key) => {
                queryClient.invalidateQueries({ queryKey: key });
            });
            setDeleteTarget(null);
        },
        onError: (error) => {
            if (isApiError(error)) {
                toast.error(getWBSErrorMessage(error.responseMessage));
            } else if (error instanceof Error) {
                toast.error(error.message);
            }
        },
    });

    // Open create dialog
    const openCreateDialog = (parent: TaskItem | null = null) => {
        setParentTask(parent);
        form.reset({
            title: '',
            description: '',
            deadline: '',
            weight: 10,
        });
        setCreateDialogOpen(true);
    };

    // Close create dialog
    const closeCreateDialog = () => {
        setCreateDialogOpen(false);
        setParentTask(null);
        form.reset();
    };

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

    // Expand all
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

    // Render task with card layout like tasks/page.tsx
    const renderTask = (task: TaskItem, depth = 0) => {
        const hasChildren = task.children && task.children.length > 0;
        const isExpanded = expandedTasks.has(task.id);
        const isOverdue = new Date(task.deadline) < new Date() && !task.isCompleted;
        const isComplete = task.actualPercentage >= 100;

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
                            {task.isLeaf && !isComplete && (
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

                    {/* Progress & Claimed */}
                    <div className="flex items-center gap-4">
                        <div className="w-32 shrink-0">
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-slate-400">Progress</span>
                                <span className="font-medium">{task.actualPercentage}%</span>
                            </div>
                            <Progress value={task.actualPercentage} className="h-2" />
                        </div>

                        <div className="w-20 shrink-0 text-xs text-center">
                            <div className="text-slate-500">Claimed</div>
                            <div className="font-medium">{task.claimedPercentage}%</div>
                        </div>
                    </div>

                    {/* Actions */}
                    {canEdit && (
                        <div className="flex gap-1 shrink-0">
                            {/* Add Subtask */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                                onClick={() => openCreateDialog(task)}
                                title="Add Subtask"
                            >
                                <Plus className="w-4 h-4" />
                            </Button>
                            {/* Edit */}
                            <Link href={`/dashboard/${projectId}/monitoring/tasks/${task.id}/edit`}>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <Edit className="w-4 h-4" />
                                </Button>
                            </Link>
                            {/* Delete */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                onClick={() => setDeleteTarget(task)}
                                disabled={!task.isLeaf || !!hasChildren}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    )}
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

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Spinner className="w-8 h-8" />
            </div>
        );
    }

    if (error) {
        return (
            <Card className="max-w-md mx-auto text-center">
                <CardContent className="pt-6">
                    <p className="text-red-500">Failed to load tasks</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <ListTodo className="w-6 h-6" />
                        Work Breakdown Structure
                    </h1>
                    <p className="text-slate-600">Task hierarchy and progress tracking</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={expandAll}>
                        Expand All
                    </Button>
                    <Button variant="outline" size="sm" onClick={collapseAll}>
                        Collapse All
                    </Button>
                    {canEdit && (
                        <Button onClick={() => openCreateDialog(null)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Root Task
                        </Button>
                    )}
                </div>
            </div>

            {/* Summary */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">Summary</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-4 gap-4 text-center">
                        <div>
                            <p className="text-2xl font-bold">{data?.tasks?.length || 0}</p>
                            <p className="text-xs text-slate-500">Root Tasks</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{data?.totalWeight || 0}%</p>
                            <p className="text-xs text-slate-500">Total Weight</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-blue-600">
                                {data?.tasks?.reduce((acc, t) => acc + (t.claimedPercentage * t.weight) / 100, 0).toFixed(1) || 0}%
                            </p>
                            <p className="text-xs text-slate-500">Claimed Progress</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-green-600">
                                {data?.tasks?.reduce((acc, t) => acc + (t.actualPercentage * t.weight) / 100, 0).toFixed(1) || 0}%
                            </p>
                            <p className="text-xs text-slate-500">Actual Progress</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* WBS Integrity */}
            <Card>
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <CardTitle className="text-base">WBS Integrity</CardTitle>
                            <CardDescription>
                                Backend validation for root, leaf, sibling, orphan, and cycle constraints
                            </CardDescription>
                        </div>
                        <Badge
                            variant={wbsValidation?.isValid ? 'default' : 'destructive'}
                            className={wbsValidation?.isValid ? 'bg-green-600' : undefined}
                        >
                            {wbsValidation?.isValid ? (
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                            ) : (
                                <AlertTriangle className="w-3 h-3 mr-1" />
                            )}
                            {wbsValidation?.isValid ? 'Valid' : 'Invalid'}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-2xl font-bold">{wbsValidation?.totalRootWeight ?? 0}%</p>
                            <p className="text-xs text-slate-500">Total Root Weight</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{wbsValidation?.totalLeafWeight ?? 0}%</p>
                            <p className="text-xs text-slate-500">Total Leaf Weight</p>
                        </div>
                    </div>

                    {wbsValidation?.errors && wbsValidation.errors.length > 0 && (
                        <div className="rounded-md border border-red-200 bg-red-50 p-3">
                            <p className="text-sm font-medium text-red-700">Validation issues</p>
                            <ul className="mt-2 space-y-1 text-sm text-red-700">
                                {wbsValidation.errors.map((item) => (
                                    <li key={item}>{getWBSErrorMessage(item)}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Task Tree */}
            <Card>
                <CardHeader>
                    <CardTitle>Tasks</CardTitle>
                    <CardDescription>
                        Click + to add subtask, expand/collapse to view hierarchy
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {data?.tasks && data.tasks.length > 0 ? (
                        <div className="space-y-2">
                            {data.tasks.map((task) => renderTask(task))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-slate-500">
                            <ListTodo className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                            <p>No tasks created yet</p>
                            {canEdit && (
                                <Button variant="outline" className="mt-4" onClick={() => openCreateDialog(null)}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Create First Task
                                </Button>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Create Task Dialog */}
            <Dialog open={createDialogOpen} onOpenChange={(open) => !open && closeCreateDialog()}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {parentTask ? `Add Subtask to "${parentTask.title}"` : 'Create Root Task'}
                        </DialogTitle>
                        <DialogDescription>
                            {parentTask
                                ? 'This task will be a child of the selected parent task.'
                                : 'This task will be a top-level task in the WBS.'
                            }
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
                        {/* Title */}
                        <div className="space-y-2">
                            <Label htmlFor="title">Title *</Label>
                            <Input
                                id="title"
                                placeholder="e.g., Foundation Work"
                                {...form.register('title')}
                                disabled={createMutation.isPending}
                            />
                            {form.formState.errors.title && (
                                <p className="text-sm text-red-500">{form.formState.errors.title.message}</p>
                            )}
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <Label htmlFor="description">Description *</Label>
                            <Textarea
                                id="description"
                                placeholder="Describe the task scope and deliverables..."
                                rows={3}
                                {...form.register('description')}
                                disabled={createMutation.isPending}
                            />
                            {form.formState.errors.description && (
                                <p className="text-sm text-red-500">{form.formState.errors.description.message}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Deadline */}
                            <div className="space-y-2">
                                <Label htmlFor="deadline">Deadline *</Label>
                                <Input
                                    id="deadline"
                                    type="date"
                                    {...form.register('deadline')}
                                    disabled={createMutation.isPending}
                                />
                                {form.formState.errors.deadline && (
                                    <p className="text-sm text-red-500">{form.formState.errors.deadline.message}</p>
                                )}
                            </div>

                            {/* Weight */}
                            <div className="space-y-2">
                                <Label htmlFor="weight">Weight (1-100) *</Label>
                                <Input
                                    id="weight"
                                    type="number"
                                    min={1}
                                    max={100}
                                    {...form.register('weight')}
                                    disabled={createMutation.isPending}
                                />
                                {form.formState.errors.weight && (
                                    <p className="text-sm text-red-500">{form.formState.errors.weight.message}</p>
                                )}
                            </div>
                        </div>

                        {createWeightWarning && (
                            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                                {createWeightWarning}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-4 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={closeCreateDialog}
                                disabled={createMutation.isPending}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={createMutation.isPending}>
                                {createMutation.isPending ? (
                                    <>
                                        <Spinner className="w-4 h-4 mr-2" />
                                        Creating...
                                    </>
                                ) : (
                                    'Create Task'
                                )}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Task</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete &quot;{deleteTarget?.title}&quot;? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
                        >
                            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
