'use client';

/**
 * Payment Requests List Page
 * Display all payment requests with status and approval timeline
 */
import { useQuery } from '@tanstack/react-query';

import { useProject, useOrganization } from '@/providers';
import { queryKeys } from '@/constants';
import { getPaymentRequests, getPaymentSummary } from '@/services';
import type { PaymentRequestStatus } from '@/types';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Progress } from '@/components/ui/progress';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    CreditCard,
    Plus,
    ArrowRight,
    Clock,
    CheckCircle2,
    XCircle,
    Banknote,
    FileText,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// Status config
const statusConfig: Record<PaymentRequestStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; icon: React.ComponentType<{ className?: string }> }> = {
    SUBMITTED: { label: 'Submitted', variant: 'secondary', icon: Clock },
    AUDITOR_APPROVED: { label: 'Auditor Approved', variant: 'default', icon: CheckCircle2 },
    AUDITOR_REJECTED: { label: 'Auditor Rejected', variant: 'destructive', icon: XCircle },
    AGENCY_APPROVED: { label: 'Agency Approved', variant: 'default', icon: CheckCircle2 },
    AGENCY_REJECTED: { label: 'Agency Rejected', variant: 'destructive', icon: XCircle },
    PAID: { label: 'Paid', variant: 'outline', icon: Banknote },
};

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

export default function PaymentRequestsPage() {
    const { projectId } = useProject();
    const { orgRole } = useOrganization();

    const canCreate = orgRole === 'CONTRACTOR';

    // Fetch requests
    const { data: requests, isLoading: requestsLoading } = useQuery({
        queryKey: queryKeys.payments.list(projectId!),
        queryFn: () => getPaymentRequests(projectId!),
        enabled: !!projectId,
    });

    // Fetch summary
    const { data: summary, isLoading: summaryLoading } = useQuery({
        queryKey: queryKeys.payments.summary(projectId!),
        queryFn: () => getPaymentSummary(projectId!),
        enabled: !!projectId,
    });

    const isLoading = requestsLoading || summaryLoading;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Spinner className="w-8 h-8" />
            </div>
        );
    }

    // Calculate progress percentage
    const progressPercent = summary
        ? (parseFloat(summary.paidAmount) / parseFloat(summary.contractValue)) * 100
        : 0;
    const canSubmitRequest = Boolean(summary?.canSubmit);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <CreditCard className="w-6 h-6" />
                        Payment Requests
                    </h1>
                    <p className="text-slate-600">Manage disbursement requests and approvals</p>
                </div>
                {canCreate && (
                    canSubmitRequest ? (
                        <Link href={`/dashboard/${projectId}/finance/request`}>
                            <Button>
                                <Plus className="w-4 h-4 mr-2" />
                                New Request
                            </Button>
                        </Link>
                    ) : (
                        <Button disabled>
                            <Plus className="w-4 h-4 mr-2" />
                            New Request
                        </Button>
                    )
                )}
            </div>

            {/* Summary Card */}
            {summary && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Payment Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-4 gap-4 mb-4">
                            <div className="text-center">
                                <p className="text-xs text-slate-500">Contract Value</p>
                                <p className="text-lg font-bold">{formatCurrency(summary.contractValue, summary.currency)}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-slate-500">Paid</p>
                                <p className="text-lg font-bold text-green-600">{formatCurrency(summary.paidAmount, summary.currency)}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-slate-500">Pending</p>
                                <p className="text-lg font-bold text-yellow-600">{formatCurrency(summary.pendingAmount, summary.currency)}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-slate-500">Available</p>
                                <p className="text-lg font-bold text-blue-600">{formatCurrency(summary.availableAmount, summary.currency)}</p>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span>Disbursement Progress</span>
                                <span>{progressPercent.toFixed(1)}%</span>
                            </div>
                            <Progress value={progressPercent} className="h-2" />
                        </div>
                        {canCreate && !summary.canSubmit && (
                            <p className="mt-3 text-sm text-amber-600">
                                New requests are disabled while a request is pending or no amount is available.
                            </p>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Requests List */}
            <Card>
                <CardHeader>
                    <CardTitle>Requests</CardTitle>
                    <CardDescription>Click on a request to view details</CardDescription>
                </CardHeader>
                <CardContent>
                    {requests && requests.length > 0 ? (
                        <div className="space-y-3">
                            {requests.map((request) => {
                                const config = statusConfig[request.status];
                                const StatusIcon = config.icon;
                                const isRejected = request.status.includes('REJECTED');
                                const isPaid = request.status === 'PAID';

                                return (
                                    <Link
                                        key={request.id}
                                        href={`/dashboard/${projectId}/finance/${request.id}`}
                                        className="block"
                                    >
                                        <div className={cn(
                                            'p-4 rounded-lg border hover:border-slate-300 transition-colors',
                                            isPaid && 'bg-green-50 border-green-200',
                                            isRejected && 'bg-red-50 border-red-200'
                                        )}>
                                            <div className="flex items-center gap-4">
                                                {/* Icon */}
                                                <div className={cn(
                                                    'w-10 h-10 rounded-full flex items-center justify-center',
                                                    isPaid ? 'bg-green-100' : isRejected ? 'bg-red-100' : 'bg-slate-100'
                                                )}>
                                                    <FileText className={cn(
                                                        'w-5 h-5',
                                                        isPaid ? 'text-green-600' : isRejected ? 'text-red-600' : 'text-slate-600'
                                                    )} />
                                                </div>

                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-medium">{request.title}</h3>
                                                        <Badge variant={config.variant}>
                                                            <StatusIcon className="w-3 h-3 mr-1" />
                                                            {config.label}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {new Date(request.createdAt).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Amount */}
                                                <div className="text-right shrink-0">
                                                    <p className="text-lg font-bold">
                                                        {formatCurrency(request.amount, summary?.currency)}
                                                    </p>
                                                </div>

                                                <ArrowRight className="w-5 h-5 text-slate-400 shrink-0" />
                                            </div>

                                            {/* Approval Timeline */}
                                            {!isRejected && (
                                                <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                                                    <div className={cn(
                                                        'flex-1 h-1 rounded',
                                                        request.auditor ? 'bg-green-500' : 'bg-slate-200'
                                                    )} />
                                                    <div className={cn(
                                                        'flex-1 h-1 rounded',
                                                        request.agency ? 'bg-green-500' : 'bg-slate-200'
                                                    )} />
                                                    <div className={cn(
                                                        'flex-1 h-1 rounded',
                                                        request.loanProvider ? 'bg-green-500' : 'bg-slate-200'
                                                    )} />
                                                </div>
                                            )}
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-slate-500">
                            <CreditCard className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                            <p>No payment requests yet</p>
                            {canCreate && summary?.canSubmit && (
                                <Link href={`/dashboard/${projectId}/finance/request`}>
                                    <Button variant="outline" className="mt-4">
                                        <Plus className="w-4 h-4 mr-2" />
                                        Create First Request
                                    </Button>
                                </Link>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
