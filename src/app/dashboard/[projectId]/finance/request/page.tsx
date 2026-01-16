'use client';

/**
 * Create Payment Request Page
 * For CONTRACTOR to request payment
 */
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useProject, useOrganization } from '@/providers';
import { queryKeys, invalidationMap } from '@/constants';
import { createPaymentRequest, getPaymentSummary } from '@/services';
import { isApiError, isValidationError } from '@/lib/api';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { FileUploader } from '@/components/ui/file-uploader';
import { ArrowLeft, CreditCard, AlertTriangle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

// Format currency
function formatCurrency(amount: string | number, currency = 'IDR'): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(num);
}

// Form schema
const requestSchema = z.object({
    title: z.string().min(3, 'Title must be at least 3 characters'),
    amount: z.coerce.number().positive('Amount must be positive'),
    invoiceFileUrl: z.string().min(1, 'Invoice file is required'),
});

type RequestFormData = z.infer<typeof requestSchema>;

export default function CreatePaymentRequestPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { projectId } = useProject();
    const { orgRole } = useOrganization();

    const isContractor = orgRole === 'CONTRACTOR';

    // Fetch summary
    const { data: summary, isLoading: summaryLoading } = useQuery({
        queryKey: queryKeys.payments.summary(projectId!),
        queryFn: () => getPaymentSummary(projectId!),
        enabled: !!projectId,
    });

    // Form
    const form = useForm<RequestFormData>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(requestSchema as any),
        defaultValues: {
            title: '',
            amount: 0,
            invoiceFileUrl: '',
        },
    });

    // Mutation
    const mutation = useMutation({
        mutationFn: (data: RequestFormData) =>
            createPaymentRequest(projectId!, {
                title: data.title,
                amount: data.amount,
                invoiceFileUrl: data.invoiceFileUrl,
            }),
        onSuccess: () => {
            toast.success('Payment request submitted successfully!');
            invalidationMap.payment(projectId!).forEach((key) => {
                queryClient.invalidateQueries({ queryKey: key });
            });
            router.push(`/dashboard/${projectId}/finance/requests`);
        },
        onError: (error) => {
            if (isValidationError(error)) {
                Object.entries(error.validationErrors).forEach(([field, message]) => {
                    form.setError(field as keyof RequestFormData, { message });
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
                    <p className="text-slate-600 mb-4">Only contractors can request payments.</p>
                    <Link href={`/dashboard/${projectId}/finance/requests`}>
                        <Button variant="outline">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Requests
                        </Button>
                    </Link>
                </CardContent>
            </Card>
        );
    }

    if (summaryLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Spinner className="w-8 h-8" />
            </div>
        );
    }

    if (!summary?.canSubmit) {
        return (
            <Card className="max-w-md mx-auto text-center">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 justify-center text-yellow-600">
                        <AlertTriangle className="w-5 h-5" />
                        Cannot Create Request
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-slate-600 mb-4">
                        {parseFloat(summary?.availableAmount || '0') <= 0
                            ? 'No available budget remaining.'
                            : 'There is a pending request. Please wait for it to be processed.'}
                    </p>
                    <Link href={`/dashboard/${projectId}/finance/requests`}>
                        <Button variant="outline">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Requests
                        </Button>
                    </Link>
                </CardContent>
            </Card>
        );
    }

    const availableAmount = parseFloat(summary.availableAmount);

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <Link
                    href={`/dashboard/${projectId}/finance/requests`}
                    className="text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1 mb-2"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Requests
                </Link>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <CreditCard className="w-6 h-6" />
                    Create Payment Request
                </h1>
                <p className="text-slate-600">Request disbursement for completed work</p>
            </div>

            {/* Available Amount */}
            <Card className="border-green-200 bg-green-50">
                <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-8 h-8 text-green-600" />
                        <div>
                            <p className="text-sm text-green-700">Available for Request</p>
                            <p className="text-2xl font-bold text-green-800">
                                {formatCurrency(summary.availableAmount, summary.currency)}
                            </p>
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="flex justify-between text-xs mb-1">
                            <span>Disbursed: {formatCurrency(summary.paidAmount, summary.currency)}</span>
                            <span>Contract: {formatCurrency(summary.contractValue, summary.currency)}</span>
                        </div>
                        <Progress
                            value={(parseFloat(summary.paidAmount) / parseFloat(summary.contractValue)) * 100}
                            className="h-2"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Form */}
            <Card>
                <CardHeader>
                    <CardTitle>Request Details</CardTitle>
                    <CardDescription>
                        Provide details for your payment request
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
                        {/* Title */}
                        <div className="space-y-2">
                            <Label htmlFor="title">Title *</Label>
                            <Input
                                id="title"
                                placeholder="e.g., Termin 1 - 10%"
                                {...form.register('title')}
                                disabled={mutation.isPending}
                            />
                            {form.formState.errors.title && (
                                <p className="text-sm text-red-500">{form.formState.errors.title.message}</p>
                            )}
                        </div>

                        {/* Amount */}
                        <div className="space-y-2">
                            <Label htmlFor="amount">Amount ({summary.currency}) *</Label>
                            <Input
                                id="amount"
                                type="number"
                                placeholder="0"
                                min={1}
                                max={availableAmount}
                                {...form.register('amount')}
                                disabled={mutation.isPending}
                            />
                            <p className="text-xs text-slate-500">
                                Maximum: {formatCurrency(availableAmount, summary.currency)}
                            </p>
                            {form.formState.errors.amount && (
                                <p className="text-sm text-red-500">{form.formState.errors.amount.message}</p>
                            )}
                        </div>

                        {/* Invoice File */}
                        <div className="space-y-2">
                            <Label>Invoice File (PDF) *</Label>
                            <FileUploader
                                mode="single"
                                value={form.watch('invoiceFileUrl')}
                                onChange={(url) => form.setValue('invoiceFileUrl', url as string, { shouldValidate: true })}
                                accept="pdf"
                                disabled={mutation.isPending}
                            />
                            {form.formState.errors.invoiceFileUrl && (
                                <p className="text-sm text-red-500">{form.formState.errors.invoiceFileUrl.message}</p>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-4 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.push(`/dashboard/${projectId}/finance/requests`)}
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
                                    'Submit Request'
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
