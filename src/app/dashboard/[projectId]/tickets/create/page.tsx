'use client';

/**
 * Create Ticket Page
 * For CONTRACTOR to report field issues
 */
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useProject, useOrganization } from '@/providers';
import { queryKeys, invalidationMap } from '@/constants';
import { createTicket, getTasks } from '@/services';
import { isApiError, isValidationError } from '@/lib/api';
import type { TaskItem } from '@/types';

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
import { FileUploader } from '@/components/ui/file-uploader';
import { ArrowLeft, Ticket, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

// Form schema
const ticketSchema = z.object({
    title: z.string().min(5, 'Title must be at least 5 characters'),
    description: z.string().min(20, 'Description must be at least 20 characters'),
    location: z.string().min(3, 'Location is required'),
    evidenceImageUrls: z.array(z.string()).min(1, 'At least one evidence photo is required'),
    taskItemId: z.string().optional(),
});

type TicketFormData = z.infer<typeof ticketSchema>;

// Flatten tasks for dropdown
function flattenLeafTasks(tasks: TaskItem[], prefix = ''): { id: string; label: string }[] {
    const result: { id: string; label: string }[] = [];
    tasks.forEach((task) => {
        if (task.isLeaf) {
            result.push({ id: task.id, label: prefix + task.title });
        }
        if (task.children && task.children.length > 0) {
            result.push(...flattenLeafTasks(task.children, prefix + '— '));
        }
    });
    return result;
}

export default function CreateTicketPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { projectId } = useProject();
    const { orgRole } = useOrganization();

    const isContractor = orgRole === 'CONTRACTOR';

    // Fetch tasks for linking
    const { data: tasksData } = useQuery({
        queryKey: queryKeys.monitoring.tasks(projectId!),
        queryFn: () => getTasks(projectId!),
        enabled: !!projectId,
    });

    const leafTasks = tasksData?.tasks ? flattenLeafTasks(tasksData.tasks) : [];

    // Form
    const form = useForm<TicketFormData>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(ticketSchema as any),
        defaultValues: {
            title: '',
            description: '',
            location: '',
            evidenceImageUrls: [],
            taskItemId: '',
        },
    });

    // Mutation
    const mutation = useMutation({
        mutationFn: (data: TicketFormData) =>
            createTicket(projectId!, {
                title: data.title,
                description: data.description,
                location: data.location,
                evidenceImageUrls: data.evidenceImageUrls,
                taskItemId: data.taskItemId || null,
            }),
        onSuccess: () => {
            toast.success('Issue reported successfully!');
            invalidationMap.ticket(projectId!).forEach((key) => {
                queryClient.invalidateQueries({ queryKey: key });
            });
            router.push(`/dashboard/${projectId}/tickets`);
        },
        onError: (error) => {
            if (isValidationError(error)) {
                Object.entries(error.validationErrors).forEach(([field, message]) => {
                    form.setError(field as keyof TicketFormData, { message });
                });
            } else if (isApiError(error)) {
                toast.error(error.responseMessage);
            }
        },
    });

    if (!isContractor) {
        return (
            <Card className="max-w-md mx-auto text-center">
                <CardHeader>
                    <CardTitle className="text-red-600">Unauthorized</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-slate-600 mb-4">Only contractors can report issues.</p>
                    <Link href={`/dashboard/${projectId}/tickets`}>
                        <Button variant="outline">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Tickets
                        </Button>
                    </Link>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <Link
                    href={`/dashboard/${projectId}/tickets`}
                    className="text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1 mb-2"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Tickets
                </Link>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Ticket className="w-6 h-6" />
                    Report Issue
                </h1>
                <p className="text-slate-600">Report a field obstruction or issue that needs resolution</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-yellow-500" />
                        Issue Details
                    </CardTitle>
                    <CardDescription>
                        Provide detailed information about the issue for faster resolution
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
                        {/* Title */}
                        <div className="space-y-2">
                            <Label htmlFor="title">Issue Title *</Label>
                            <Input
                                id="title"
                                placeholder="e.g., Land obstruction at KM 5"
                                {...form.register('title')}
                                disabled={mutation.isPending}
                            />
                            {form.formState.errors.title && (
                                <p className="text-sm text-red-500">{form.formState.errors.title.message}</p>
                            )}
                        </div>

                        {/* Location */}
                        <div className="space-y-2">
                            <Label htmlFor="location">Location *</Label>
                            <Input
                                id="location"
                                placeholder="e.g., KM 5, Section A, Near the bridge"
                                {...form.register('location')}
                                disabled={mutation.isPending}
                            />
                            {form.formState.errors.location && (
                                <p className="text-sm text-red-500">{form.formState.errors.location.message}</p>
                            )}
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <Label htmlFor="description">Description *</Label>
                            <Textarea
                                id="description"
                                placeholder="Describe the issue in detail: what is blocking work, what has been tried, what assistance is needed..."
                                rows={5}
                                {...form.register('description')}
                                disabled={mutation.isPending}
                            />
                            {form.formState.errors.description && (
                                <p className="text-sm text-red-500">{form.formState.errors.description.message}</p>
                            )}
                        </div>

                        {/* Evidence Photos */}
                        <div className="space-y-2">
                            <Label>Evidence Photos *</Label>
                            <FileUploader
                                mode="multi"
                                value={form.watch('evidenceImageUrls')}
                                onChange={(urls) => form.setValue('evidenceImageUrls', urls as string[], { shouldValidate: true })}
                                maxFiles={5}
                                accept="image"
                                disabled={mutation.isPending}
                            />
                            <p className="text-xs text-slate-500">Upload at least 1 photo (max 5)</p>
                            {form.formState.errors.evidenceImageUrls && (
                                <p className="text-sm text-red-500">{form.formState.errors.evidenceImageUrls.message}</p>
                            )}
                        </div>

                        {/* Related Task */}
                        <div className="space-y-2">
                            <Label>Related Task (Optional)</Label>
                            <Select
                                value={form.watch('taskItemId') || ''}
                                onValueChange={(v) => form.setValue('taskItemId', v === 'none' ? '' : v)}
                                disabled={mutation.isPending}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select related task..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No related task</SelectItem>
                                    {leafTasks.map((task) => (
                                        <SelectItem key={task.id} value={task.id}>
                                            {task.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-slate-500">Link this issue to a specific WBS task</p>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-4 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.push(`/dashboard/${projectId}/tickets`)}
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
                                    'Report Issue'
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
