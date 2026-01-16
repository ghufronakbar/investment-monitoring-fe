'use client';

/**
 * Validate Progress Page
 * For INDEPENDENT_AUDITOR to approve/reject progress submissions
 */
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useProject, useOrganization } from '@/providers';
import { queryKeys } from '@/constants';
import { getProgressLogs, validateProgress } from '@/services';
import { isApiError, isValidationError } from '@/lib/api';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { ArrowLeft, CheckCircle, XCircle, FileCheck, Weight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const validateSchema = z.object({
    realProgressPercentage: z.coerce.number().int().min(0).max(100),
    comment: z.string().optional(),
});

type ValidateFormData = z.infer<typeof validateSchema>;

export default function ValidateProgressPage() {
    const router = useRouter();
    const params = useParams();
    const logId = params.logId as string;
    const queryClient = useQueryClient();
    const { projectId } = useProject();
    const { orgRole } = useOrganization();

    const isAuditor = orgRole === 'INDEPENDENT_AUDITOR';

    // State for approve/reject switch
    const [isApprove, setIsApprove] = useState(true);

    // Get all logs to find the specific one
    const { data: logsData, isLoading } = useQuery({
        queryKey: queryKeys.monitoring.logs(projectId!),
        queryFn: () => getProgressLogs(projectId!),
        enabled: !!projectId,
    });

    const log = logsData?.find((l) => l.id === logId);
    const claimedProgress = log?.progressPercentage || 0;

    // Form
    const form = useForm<ValidateFormData>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(validateSchema as any),
        defaultValues: {
            realProgressPercentage: claimedProgress,
            comment: '',
        },
    });

    // Update form value when switching to approve
    useEffect(() => {
        if (isApprove) {
            form.setValue('realProgressPercentage', claimedProgress);
        }
    }, [isApprove, claimedProgress, form]);

    // Mutation
    const mutation = useMutation({
        mutationFn: (data: ValidateFormData) =>
            validateProgress(logId, {
                realProgressPercentage: data.realProgressPercentage,
                comment: data.comment || null,
            }),
        onSuccess: () => {
            toast.success(isApprove ? 'Progress approved!' : 'Progress rejected');
            queryClient.invalidateQueries({ queryKey: queryKeys.monitoring.logs(projectId!) });
            queryClient.invalidateQueries({ queryKey: queryKeys.monitoring.pending(projectId!) });
            router.push(`/dashboard/${projectId}/validations`);
        },
        onError: (error) => {
            if (isValidationError(error)) {
                Object.entries(error.validationErrors).forEach(([field, message]) => {
                    form.setError(field as keyof ValidateFormData, { message });
                });
            } else if (isApiError(error)) {
                toast.error(error.responseMessage);
            }
        },
    });

    const handleSubmit = (data: ValidateFormData) => {
        // If rejecting, comment is required
        if (!isApprove && !data.comment) {
            form.setError('comment', { message: 'Comment is required when rejecting' });
            return;
        }
        mutation.mutate(data);
    };

    if (!isAuditor) {
        return (
            <Card className="max-w-md mx-auto text-center">
                <CardHeader>
                    <CardTitle className="text-red-600">Unauthorized</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-slate-600">Only auditors can validate progress.</p>
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

    if (!log) {
        return (
            <Card className="max-w-md mx-auto text-center">
                <CardContent className="pt-6">
                    <p className="text-red-500 mb-4">Progress log not found</p>
                    <Link href={`/dashboard/${projectId}/validations`}>
                        <Button variant="outline">Back to Validations</Button>
                    </Link>
                </CardContent>
            </Card>
        );
    }

    if (log.validation) {
        return (
            <Card className="max-w-md mx-auto text-center">
                <CardContent className="pt-6">
                    <p className="text-yellow-600 mb-4">This submission has already been validated</p>
                    <Link href={`/dashboard/${projectId}/validations`}>
                        <Button variant="outline">Back to Validations</Button>
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
                    href={`/dashboard/${projectId}/validations`}
                    className="text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1 mb-2"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Validations
                </Link>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <FileCheck className="w-6 h-6" />
                    Validate Progress
                </h1>
                <p className="text-slate-600">Review submission and approve or reject</p>
            </div>

            {/* Submission Details */}
            <Card>
                <CardHeader>
                    <CardTitle>{log.snapshotTitle}</CardTitle>
                    <CardDescription>
                        Submitted by {log.vendorName} on {new Date(log.createdAt).toLocaleString()}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-4 text-sm">
                        <Badge variant="outline" className="text-lg font-bold px-3 py-1">
                            {log.progressPercentage}% Claimed
                        </Badge>
                        <span className="flex items-center gap-1 text-slate-500">
                            <Weight className="w-4 h-4" />
                            Weight: {log.snapshotWeight}%
                        </span>
                    </div>

                    <div>
                        <Label className="text-slate-500">Work Report</Label>
                        <p className="mt-1 p-3 rounded-lg bg-slate-50">{log.report}</p>
                    </div>

                    {/* Evidence Images */}
                    <div>
                        <Label className="text-slate-500">Evidence Photos ({log.evidenceImageUrls.length})</Label>
                        <div className="grid grid-cols-3 gap-2 mt-2">
                            {log.evidenceImageUrls.map((url, idx) => (
                                <a
                                    key={idx}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="aspect-square rounded-lg overflow-hidden border hover:ring-2 hover:ring-primary transition-all"
                                >
                                    <img
                                        src={url}
                                        alt={`Evidence ${idx + 1}`}
                                        className="w-full h-full object-cover"
                                    />
                                </a>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Validation Form */}
            <Card>
                <CardHeader>
                    <CardTitle>Your Decision</CardTitle>
                    <CardDescription>
                        Choose to approve or reject this progress submission
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                        {/* Approve/Reject Switch */}
                        <div className="space-y-4">
                            <div className={cn(
                                'p-4 rounded-lg border-2 transition-colors',
                                isApprove ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'
                            )}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        {isApprove ? (
                                            <CheckCircle className="w-6 h-6 text-green-600" />
                                        ) : (
                                            <XCircle className="w-6 h-6 text-red-600" />
                                        )}
                                        <div>
                                            <p className={cn(
                                                'font-semibold',
                                                isApprove ? 'text-green-700' : 'text-red-700'
                                            )}>
                                                {isApprove ? 'Approve' : 'Reject'}
                                            </p>
                                            <p className={cn(
                                                'text-sm',
                                                isApprove ? 'text-green-600' : 'text-red-600'
                                            )}>
                                                {isApprove
                                                    ? `Accept claimed progress of ${claimedProgress}%`
                                                    : 'Set a different actual progress value'
                                                }
                                            </p>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={isApprove}
                                        onCheckedChange={setIsApprove}
                                        disabled={mutation.isPending}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Actual Progress - only visible when rejecting */}
                        {!isApprove && (
                            <div className="space-y-2 p-4 rounded-lg bg-slate-50 border">
                                <Label htmlFor="realProgressPercentage">
                                    Actual Progress (0-{claimedProgress - 1}) *
                                </Label>
                                <Input
                                    id="realProgressPercentage"
                                    type="number"
                                    min={0}
                                    max={claimedProgress - 1}
                                    {...form.register('realProgressPercentage')}
                                    disabled={mutation.isPending}
                                />
                                <p className="text-xs text-slate-500">
                                    Maximum value is below the claimed percentage (max: {claimedProgress - 1}%)
                                </p>
                                {form.formState.errors.realProgressPercentage && (
                                    <p className="text-sm text-red-500">
                                        {form.formState.errors.realProgressPercentage.message}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Comment */}
                        <div className="space-y-2">
                            <Label htmlFor="comment">
                                Comment {!isApprove && <span className="text-red-500">*</span>}
                            </Label>
                            <Textarea
                                id="comment"
                                rows={3}
                                placeholder={!isApprove
                                    ? 'Explain why this submission is rejected...'
                                    : 'Optional notes...'
                                }
                                {...form.register('comment')}
                                disabled={mutation.isPending}
                            />
                            {form.formState.errors.comment && (
                                <p className="text-sm text-red-500">{form.formState.errors.comment.message}</p>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-4 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.push(`/dashboard/${projectId}/validations`)}
                                disabled={mutation.isPending}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={mutation.isPending}
                                className={cn(
                                    isApprove
                                        ? 'bg-green-600 hover:bg-green-700'
                                        : 'bg-red-600 hover:bg-red-700'
                                )}
                            >
                                {mutation.isPending ? (
                                    <>
                                        <Spinner className="w-4 h-4 mr-2" />
                                        Processing...
                                    </>
                                ) : isApprove ? (
                                    <>
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        Approve
                                    </>
                                ) : (
                                    <>
                                        <XCircle className="w-4 h-4 mr-2" />
                                        Reject
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
