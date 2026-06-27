'use client';

/**
 * Submit Progress Page
 * For CONTRACTOR to submit progress with evidence
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useProject, useOrganization } from '@/providers';
import { queryKeys } from '@/constants';
import { submitProgress, getLeafTasks } from '@/services';
import { getApiErrorMessage, isApiError, isValidationError } from '@/lib/api';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
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
import { ArrowLeft, ClipboardCheck, Camera } from 'lucide-react';
import Link from 'next/link';

const progressSchema = z.object({
    taskId: z.string().min(1, 'Please select a task'),
    progressPercentage: z.coerce.number().int().min(1).max(100, 'Progress must be between 1 and 100'),
    report: z.string().min(20, 'Report must be at least 20 characters'),
});

type ProgressFormData = z.infer<typeof progressSchema>;

export default function SubmitProgressPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { projectId } = useProject();
    const { orgRole } = useOrganization();

    const isContractor = orgRole === 'CONTRACTOR';

    const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);

    // Get leaf tasks for dropdown
    const { data: tasksData, isLoading: tasksLoading } = useQuery({
        queryKey: queryKeys.monitoring.leafTasks(projectId!),
        queryFn: () => getLeafTasks(projectId!),
        enabled: !!projectId,
    });

    // Form
    const form = useForm<ProgressFormData>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(progressSchema as any),
        defaultValues: {
            taskId: '',
            progressPercentage: 10,
            report: '',
        },
    });

    const selectedTaskId = form.watch('taskId');
    const selectedTask = tasksData?.find((t) => t.id === selectedTaskId);

    // Mutation
    const mutation = useMutation({
        mutationFn: (data: ProgressFormData) =>
            submitProgress(data.taskId, {
                progressPercentage: data.progressPercentage,
                report: data.report,
                evidenceImageUrls: evidenceUrls,
            }),
        onSuccess: () => {
            toast.success('Progress submitted successfully!');
            queryClient.invalidateQueries({ queryKey: queryKeys.monitoring.leafTasks(projectId!) });
            queryClient.invalidateQueries({ queryKey: queryKeys.monitoring.logs(projectId!) });
            router.push(`/dashboard/${projectId}/tasks`);
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

    const handleSubmit = (data: ProgressFormData) => {
        if (evidenceUrls.length === 0) {
            toast.error('Please upload at least one evidence image');
            return;
        }
        mutation.mutate(data);
    };

    if (!isContractor) {
        return (
            <Card className="max-w-md mx-auto text-center">
                <CardHeader>
                    <CardTitle className="text-red-600">Unauthorized</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-slate-600 mb-4">Only contractors can submit progress.</p>
                    <Link href={`/dashboard/${projectId}/overview`}>
                        <Button variant="outline">Back to Overview</Button>
                    </Link>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="max-w-lg mx-auto space-y-6">
            {/* Header */}
            <div>
                <Link
                    href={`/dashboard/${projectId}/tasks`}
                    className="text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1 mb-2"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Tasks
                </Link>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <ClipboardCheck className="w-6 h-6" />
                    Submit Progress
                </h1>
                <p className="text-slate-600">Report work progress with photo evidence</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Progress Report</CardTitle>
                    <CardDescription>
                        Select a task and provide details about the work completed
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                        {/* Task Selection */}
                        <div className="space-y-2">
                            <Label>Select Task *</Label>
                            <Select
                                value={form.watch('taskId')}
                                onValueChange={(value) => form.setValue('taskId', value, { shouldValidate: true })}
                                disabled={mutation.isPending || tasksLoading}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose a task..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {tasksData?.map((task) => (
                                        <SelectItem key={task.id} value={task.id}>
                                            {task.title} ({task.actualPercentage}% done)
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {form.formState.errors.taskId && (
                                <p className="text-sm text-red-500">{form.formState.errors.taskId.message}</p>
                            )}
                        </div>

                        {/* Selected Task Info */}
                        {selectedTask && (
                            <div className="p-3 rounded-lg bg-slate-50 space-y-2">
                                <p className="font-medium">{selectedTask.title}</p>
                                <div className="flex justify-between text-xs text-slate-500">
                                    <span>Current Progress</span>
                                    <span>{selectedTask.actualPercentage}%</span>
                                </div>
                                <Progress value={selectedTask.actualPercentage} className="h-2" />
                            </div>
                        )}

                        {/* Progress Percentage */}
                        <div className="space-y-2">
                            <Label htmlFor="progressPercentage">New Progress Percentage (1-100) *</Label>
                            <Input
                                id="progressPercentage"
                                type="number"
                                min={1}
                                max={100}
                                {...form.register('progressPercentage')}
                                disabled={mutation.isPending}
                            />
                            <p className="text-xs text-slate-500">
                                Your claimed progress for this submission
                            </p>
                            {form.formState.errors.progressPercentage && (
                                <p className="text-sm text-red-500">{form.formState.errors.progressPercentage.message}</p>
                            )}
                        </div>

                        {/* Report */}
                        <div className="space-y-2">
                            <Label htmlFor="report">Work Report *</Label>
                            <Textarea
                                id="report"
                                rows={4}
                                placeholder="Describe the work completed, materials used, and any challenges faced..."
                                {...form.register('report')}
                                disabled={mutation.isPending}
                            />
                            {form.formState.errors.report && (
                                <p className="text-sm text-red-500">{form.formState.errors.report.message}</p>
                            )}
                        </div>

                        {/* Evidence Images */}
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
                            <p className="text-xs text-slate-500">
                                At least 1 photo required. Max 5 photos.
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-4 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.push(`/dashboard/${projectId}/tasks`)}
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
                </CardContent>
            </Card>
        </div>
    );
}
