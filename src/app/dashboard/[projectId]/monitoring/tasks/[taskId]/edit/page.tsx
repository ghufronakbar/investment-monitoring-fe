'use client';

/**
 * Edit Task Page
 * For EXECUTING_AGENCY ADMIN to update WBS tasks
 */
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useProject, useOrganization } from '@/providers';
import { queryKeys } from '@/constants';
import { updateTask, getTasks } from '@/services';
import { isApiError, isValidationError } from '@/lib/api';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { ArrowLeft, Edit } from 'lucide-react';
import Link from 'next/link';
import type { TaskItem } from '@/types';
import { useEffect } from 'react';

const taskSchema = z.object({
    title: z.string().min(3, 'Title must be at least 3 characters'),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    deadline: z.string().min(1, 'Deadline is required'),
    weight: z.coerce.number().int().min(1).max(100, 'Weight must be between 1 and 100'),
    parentId: z.string().optional(),
});

type TaskFormData = z.infer<typeof taskSchema>;

// Find task by ID in tree
function findTask(tasks: TaskItem[], id: string): TaskItem | null {
    for (const task of tasks) {
        if (task.id === id) return task;
        if (task.children) {
            const found = findTask(task.children, id);
            if (found) return found;
        }
    }
    return null;
}

// Flatten task tree for parent dropdown, excluding self and descendants
function flattenTasks(tasks: TaskItem[], excludeId: string, prefix = ''): { id: string; label: string }[] {
    const result: { id: string; label: string }[] = [];
    tasks.forEach((task) => {
        if (task.id === excludeId) return; // Skip self and all descendants
        result.push({ id: task.id, label: prefix + task.title });
        if (task.children && task.children.length > 0) {
            result.push(...flattenTasks(task.children, excludeId, prefix + '— '));
        }
    });
    return result;
}

export default function EditTaskPage() {
    const router = useRouter();
    const params = useParams();
    const taskId = params.taskId as string;
    const queryClient = useQueryClient();
    const { projectId } = useProject();
    const { orgRole, isAdmin } = useOrganization();

    const canEdit = orgRole === 'EXECUTING_AGENCY' && isAdmin;

    // Get tasks
    const { data: tasksData, isLoading } = useQuery({
        queryKey: queryKeys.monitoring.tasks(projectId!),
        queryFn: () => getTasks(projectId!),
        enabled: !!projectId,
    });

    const task = tasksData?.tasks ? findTask(tasksData.tasks, taskId) : null;
    const parentOptions = tasksData?.tasks ? flattenTasks(tasksData.tasks, taskId) : [];

    // Form
    const form = useForm<TaskFormData>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(taskSchema as any),
        defaultValues: {
            title: '',
            description: '',
            deadline: '',
            weight: 10,
            parentId: '',
        },
    });

    // Populate form when task is loaded
    useEffect(() => {
        if (task) {
            form.reset({
                title: task.title,
                description: task.description,
                deadline: new Date(task.deadline).toISOString().split('T')[0],
                weight: task.weight,
                parentId: task.parentId || '',
            });
        }
    }, [task, form]);

    // Mutation
    const mutation = useMutation({
        mutationFn: (data: TaskFormData) =>
            updateTask(taskId, {
                title: data.title,
                description: data.description,
                deadline: new Date(data.deadline).toISOString(),
                weight: data.weight,
                parentId: data.parentId || null,
            }),
        onSuccess: () => {
            toast.success('Task updated successfully!');
            queryClient.invalidateQueries({ queryKey: queryKeys.monitoring.tasks(projectId!) });
            router.push(`/dashboard/${projectId}/monitoring/tasks`);
        },
        onError: (error) => {
            if (isValidationError(error)) {
                Object.entries(error.validationErrors).forEach(([field, message]) => {
                    form.setError(field as keyof TaskFormData, { message });
                });
            } else if (isApiError(error)) {
                toast.error(error.responseMessage);
            }
        },
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Spinner className="w-8 h-8" />
            </div>
        );
    }

    if (!task) {
        return (
            <Card className="max-w-md mx-auto text-center">
                <CardContent className="pt-6">
                    <p className="text-red-500 mb-4">Task not found</p>
                    <Link href={`/dashboard/${projectId}/monitoring/tasks`}>
                        <Button variant="outline">Back to Tasks</Button>
                    </Link>
                </CardContent>
            </Card>
        );
    }

    if (!canEdit) {
        return (
            <div className="p-8">
                <Card className="max-w-md mx-auto text-center">
                    <CardHeader>
                        <CardTitle className="text-red-600">Unauthorized</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-slate-600 mb-4">
                            Only Executing Agency administrators can edit tasks.
                        </p>
                        <Link href={`/dashboard/${projectId}/monitoring/tasks`}>
                            <Button variant="outline">
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back to Tasks
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-lg mx-auto space-y-6">
            <div>
                <Link
                    href={`/dashboard/${projectId}/monitoring/tasks`}
                    className="text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1 mb-2"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Tasks
                </Link>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Edit className="w-6 h-6" />
                    Edit Task
                </h1>
                <p className="text-slate-600">Update task properties</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Task Details</CardTitle>
                    <CardDescription>
                        Modify task properties. Changes will be reflected in the WBS.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
                        {/* Title */}
                        <div className="space-y-2">
                            <Label htmlFor="title">Title *</Label>
                            <Input
                                id="title"
                                {...form.register('title')}
                                disabled={mutation.isPending}
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
                                rows={3}
                                {...form.register('description')}
                                disabled={mutation.isPending}
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
                                    disabled={mutation.isPending}
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
                                    disabled={mutation.isPending}
                                />
                                {form.formState.errors.weight && (
                                    <p className="text-sm text-red-500">{form.formState.errors.weight.message}</p>
                                )}
                            </div>
                        </div>

                        {/* Parent Task */}
                        <div className="space-y-2">
                            <Label>Parent Task (Optional)</Label>
                            <Select
                                value={form.watch('parentId') || 'none'}
                                onValueChange={(value) => form.setValue('parentId', value === 'none' ? '' : value)}
                                disabled={mutation.isPending}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="No parent (root task)" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No parent (root task)</SelectItem>
                                    {parentOptions.map((option) => (
                                        <SelectItem key={option.id} value={option.id}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-4 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.push(`/dashboard/${projectId}/monitoring/tasks`)}
                                disabled={mutation.isPending}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={mutation.isPending}>
                                {mutation.isPending ? (
                                    <>
                                        <Spinner className="w-4 h-4 mr-2" />
                                        Saving...
                                    </>
                                ) : (
                                    'Save Changes'
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
