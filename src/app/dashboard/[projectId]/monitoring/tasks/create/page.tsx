'use client';

/**
 * Create Task Page
 * For EXECUTING_AGENCY ADMIN to create WBS tasks
 */
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useProject, useOrganization } from '@/providers';
import { queryKeys } from '@/constants';
import { createTask, getTasks } from '@/services';
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
import { ArrowLeft, Plus } from 'lucide-react';
import Link from 'next/link';
import type { TaskItem } from '@/types';

const taskSchema = z.object({
    title: z.string().min(3, 'Title must be at least 3 characters'),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    deadline: z.string().min(1, 'Deadline is required'),
    weight: z.coerce.number().int().min(1).max(100, 'Weight must be between 1 and 100'),
    parentId: z.string().optional(),
});

type TaskFormData = z.infer<typeof taskSchema>;

// Flatten task tree for parent dropdown
function flattenTasks(tasks: TaskItem[], prefix = ''): { id: string; label: string }[] {
    const result: { id: string; label: string }[] = [];
    tasks.forEach((task) => {
        result.push({ id: task.id, label: prefix + task.title });
        if (task.children && task.children.length > 0) {
            result.push(...flattenTasks(task.children, prefix + '— '));
        }
    });
    return result;
}

export default function CreateTaskPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { projectId, project } = useProject();
    const { orgRole, isAdmin } = useOrganization();

    const canCreate = orgRole === 'EXECUTING_AGENCY' && isAdmin;

    // Get existing tasks for parent dropdown
    const { data: tasksData } = useQuery({
        queryKey: queryKeys.monitoring.tasks(projectId!),
        queryFn: () => getTasks(projectId!),
        enabled: !!projectId,
    });

    const parentOptions = tasksData?.tasks ? flattenTasks(tasksData.tasks) : [];

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

    // Mutation
    const mutation = useMutation({
        mutationFn: (data: TaskFormData) =>
            createTask(projectId!, {
                title: data.title,
                description: data.description,
                deadline: new Date(data.deadline).toISOString(),
                weight: data.weight,
                parentId: data.parentId || null,
            }),
        onSuccess: () => {
            toast.success('Task created successfully!');
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

    if (!canCreate) {
        return (
            <div className="p-8">
                <Card className="max-w-md mx-auto text-center">
                    <CardHeader>
                        <CardTitle className="text-red-600">Unauthorized</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-slate-600 mb-4">
                            Only Executing Agency administrators can create tasks.
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
                    <Plus className="w-6 h-6" />
                    Create Task
                </h1>
                <p className="text-slate-600">Add a new task to the Work Breakdown Structure</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Task Details</CardTitle>
                    <CardDescription>
                        Define task properties. Leaf tasks (no children) can receive progress submissions.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
                        {/* Title */}
                        <div className="space-y-2">
                            <Label htmlFor="title">Title *</Label>
                            <Input
                                id="title"
                                placeholder="e.g., Foundation Work"
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
                                placeholder="Describe the task scope and deliverables..."
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
                                value={form.watch('parentId') || ''}
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
                            <p className="text-xs text-slate-500">
                                Select a parent task to create a sub-task
                            </p>
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
                                        Creating...
                                    </>
                                ) : (
                                    'Create Task'
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
