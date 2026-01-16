'use client';

/**
 * Payment Request Detail Page
 * Show request info with role-based approval actions
 */
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useProject, useOrganization } from '@/providers';
import { queryKeys, invalidationMap } from '@/constants';
import { getPaymentRequestDetail, approveByAuditor, approveByAgency, disbursePayment } from '@/services';
import { isApiError } from '@/lib/api';
import type { PaymentRequestStatus } from '@/types';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
    CreditCard,
    ArrowLeft,
    Clock,
    CheckCircle2,
    XCircle,
    Banknote,
    FileText,
    ExternalLink,
    AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// Status config
const statusConfig: Record<PaymentRequestStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; color: string }> = {
    SUBMITTED: { label: 'Submitted', variant: 'secondary', color: 'bg-slate-500' },
    AUDITOR_APPROVED: { label: 'Auditor Approved', variant: 'default', color: 'bg-blue-500' },
    AUDITOR_REJECTED: { label: 'Auditor Rejected', variant: 'destructive', color: 'bg-red-500' },
    AGENCY_APPROVED: { label: 'Agency Approved', variant: 'default', color: 'bg-blue-500' },
    AGENCY_REJECTED: { label: 'Agency Rejected', variant: 'destructive', color: 'bg-red-500' },
    PAID: { label: 'Paid', variant: 'outline', color: 'bg-green-500' },
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

export default function PaymentRequestDetailPage() {
    const router = useRouter();
    const params = useParams();
    const requestId = params.requestId as string;
    const queryClient = useQueryClient();
    const { projectId } = useProject();
    const { orgRole } = useOrganization();

    const [disburseDialogOpen, setDisburseDialogOpen] = useState(false);
    const [paymentProofs, setPaymentProofs] = useState<string[]>([]);

    // Permissions
    const canApproveAsAuditor = orgRole === 'INDEPENDENT_AUDITOR';
    const canApproveAsAgency = orgRole === 'EXECUTING_AGENCY';
    const canDisburse = orgRole === 'LOAN_PROVIDER';

    // Fetch request detail
    const { data: request, isLoading, error } = useQuery({
        queryKey: queryKeys.payments.detail(requestId),
        queryFn: () => getPaymentRequestDetail(requestId),
        enabled: !!requestId,
    });

    // Auditor approval mutation
    const auditorMutation = useMutation({
        mutationFn: (action: 'APPROVE' | 'REJECT') => approveByAuditor(requestId, { action }),
        onSuccess: (_, action) => {
            toast.success(action === 'APPROVE' ? 'Request approved!' : 'Request rejected');
            invalidationMap.payment(projectId!, requestId).forEach((key) => {
                queryClient.invalidateQueries({ queryKey: key });
            });
        },
        onError: (error) => {
            if (isApiError(error)) {
                toast.error(error.responseMessage);
            }
        },
    });

    // Agency approval mutation
    const agencyMutation = useMutation({
        mutationFn: (action: 'APPROVE' | 'REJECT') => approveByAgency(requestId, { action }),
        onSuccess: (_, action) => {
            toast.success(action === 'APPROVE' ? 'Request approved!' : 'Request rejected');
            invalidationMap.payment(projectId!, requestId).forEach((key) => {
                queryClient.invalidateQueries({ queryKey: key });
            });
        },
        onError: (error) => {
            if (isApiError(error)) {
                toast.error(error.responseMessage);
            }
        },
    });

    // Disburse mutation
    const disburseMutation = useMutation({
        mutationFn: () => disbursePayment(requestId, { paymentProofImageUrls: paymentProofs }),
        onSuccess: () => {
            toast.success('Payment disbursed successfully!');
            invalidationMap.payment(projectId!, requestId).forEach((key) => {
                queryClient.invalidateQueries({ queryKey: key });
            });
            setDisburseDialogOpen(false);
        },
        onError: (error) => {
            if (isApiError(error)) {
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

    if (error || !request) {
        return (
            <Card className="max-w-md mx-auto text-center">
                <CardContent className="pt-6">
                    <p className="text-red-500 mb-4">Request not found</p>
                    <Link href={`/dashboard/${projectId}/finance/requests`}>
                        <Button variant="outline">Back to Requests</Button>
                    </Link>
                </CardContent>
            </Card>
        );
    }

    const config = statusConfig[request.status];
    const isPending = auditorMutation.isPending || agencyMutation.isPending || disburseMutation.isPending;
    const isRejected = request.status.includes('REJECTED');
    const isPaid = request.status === 'PAID';

    // Determine available actions
    const showAuditorActions = canApproveAsAuditor && request.status === 'SUBMITTED';
    const showAgencyActions = canApproveAsAgency && request.status === 'AUDITOR_APPROVED';
    const showDisburseAction = canDisburse && request.status === 'AGENCY_APPROVED';

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <Link
                    href={`/dashboard/${projectId}/finance/requests`}
                    className="text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1 mb-2"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Requests
                </Link>
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold">{request.title}</h1>
                            <Badge variant={config.variant}>{config.label}</Badge>
                        </div>
                        <p className="text-slate-600 mt-1">
                            Submitted on {new Date(request.createdAt).toLocaleString()}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-slate-500">Amount</p>
                        <p className="text-3xl font-bold">{formatCurrency(request.amount)}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="col-span-2 space-y-6">
                    {/* Invoice */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="w-5 h-5" />
                                Invoice
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <a
                                href={request.invoiceFileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-primary hover:underline"
                            >
                                <FileText className="w-4 h-4" />
                                View Invoice PDF
                                <ExternalLink className="w-4 h-4" />
                            </a>
                        </CardContent>
                    </Card>

                    {/* Approval Timeline */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Approval Timeline</CardTitle>
                            <CardDescription>Status of each approval step</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {/* Step 1: Auditor */}
                                <div className="flex items-start gap-4">
                                    <div className={cn(
                                        'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                                        request.auditor ? 'bg-green-100' :
                                            request.status === 'AUDITOR_REJECTED' ? 'bg-red-100' :
                                                request.status === 'SUBMITTED' ? 'bg-yellow-100' : 'bg-slate-100'
                                    )}>
                                        {request.auditor ? (
                                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                                        ) : request.status === 'AUDITOR_REJECTED' ? (
                                            <XCircle className="w-5 h-5 text-red-600" />
                                        ) : request.status === 'SUBMITTED' ? (
                                            <Clock className="w-5 h-5 text-yellow-600" />
                                        ) : (
                                            <Clock className="w-5 h-5 text-slate-400" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium">Technical Review (Auditor)</p>
                                        {request.auditor ? (
                                            <div className="text-sm text-slate-500">
                                                <p>Approved by {request.auditor.orgName}</p>
                                                <p className="text-xs">{new Date(request.auditor.approvedAt).toLocaleString()}</p>
                                            </div>
                                        ) : request.status === 'AUDITOR_REJECTED' ? (
                                            <p className="text-sm text-red-500">Rejected</p>
                                        ) : request.status === 'SUBMITTED' ? (
                                            <p className="text-sm text-yellow-600">Awaiting review</p>
                                        ) : (
                                            <p className="text-sm text-slate-400">Pending</p>
                                        )}
                                    </div>
                                </div>

                                {/* Step 2: Agency */}
                                <div className="flex items-start gap-4">
                                    <div className={cn(
                                        'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                                        request.agency ? 'bg-green-100' :
                                            request.status === 'AGENCY_REJECTED' ? 'bg-red-100' :
                                                request.status === 'AUDITOR_APPROVED' ? 'bg-yellow-100' : 'bg-slate-100'
                                    )}>
                                        {request.agency ? (
                                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                                        ) : request.status === 'AGENCY_REJECTED' ? (
                                            <XCircle className="w-5 h-5 text-red-600" />
                                        ) : request.status === 'AUDITOR_APPROVED' ? (
                                            <Clock className="w-5 h-5 text-yellow-600" />
                                        ) : (
                                            <Clock className="w-5 h-5 text-slate-400" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium">Administrative Review (Agency)</p>
                                        {request.agency ? (
                                            <div className="text-sm text-slate-500">
                                                <p>Approved by {request.agency.orgName}</p>
                                                <p className="text-xs">{new Date(request.agency.approvedAt).toLocaleString()}</p>
                                            </div>
                                        ) : request.status === 'AGENCY_REJECTED' ? (
                                            <p className="text-sm text-red-500">Rejected</p>
                                        ) : request.status === 'AUDITOR_APPROVED' ? (
                                            <p className="text-sm text-yellow-600">Awaiting review</p>
                                        ) : (
                                            <p className="text-sm text-slate-400">Pending</p>
                                        )}
                                    </div>
                                </div>

                                {/* Step 3: Disbursement */}
                                <div className="flex items-start gap-4">
                                    <div className={cn(
                                        'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                                        request.loanProvider ? 'bg-green-100' :
                                            request.status === 'AGENCY_APPROVED' ? 'bg-yellow-100' : 'bg-slate-100'
                                    )}>
                                        {request.loanProvider ? (
                                            <Banknote className="w-5 h-5 text-green-600" />
                                        ) : request.status === 'AGENCY_APPROVED' ? (
                                            <Clock className="w-5 h-5 text-yellow-600" />
                                        ) : (
                                            <Clock className="w-5 h-5 text-slate-400" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium">Disbursement (Loan Provider)</p>
                                        {request.loanProvider ? (
                                            <div className="text-sm text-slate-500">
                                                <p>Paid by {request.loanProvider.orgName}</p>
                                                <p className="text-xs">{new Date(request.loanProvider.approvedAt).toLocaleString()}</p>
                                            </div>
                                        ) : request.status === 'AGENCY_APPROVED' ? (
                                            <p className="text-sm text-yellow-600">Ready for disbursement</p>
                                        ) : (
                                            <p className="text-sm text-slate-400">Pending</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Payment Proofs (if paid) */}
                    {isPaid && request.paymentProofImageUrls.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Banknote className="w-5 h-5" />
                                    Payment Proof
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-3 gap-3">
                                    {request.paymentProofImageUrls.map((url, idx) => (
                                        <a
                                            key={idx}
                                            href={url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="aspect-square rounded-lg overflow-hidden border hover:ring-2 hover:ring-primary transition-all"
                                        >
                                            <img
                                                src={url}
                                                alt={`Proof ${idx + 1}`}
                                                className="w-full h-full object-cover"
                                            />
                                        </a>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Sidebar - Actions */}
                <div className="space-y-4">
                    {/* Auditor Actions */}
                    {showAuditorActions && (
                        <Card className="border-blue-200 bg-blue-50">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm">Your Action Required</CardTitle>
                                <CardDescription>Technical Review</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <Button
                                    className="w-full bg-green-600 hover:bg-green-700"
                                    onClick={() => auditorMutation.mutate('APPROVE')}
                                    disabled={isPending}
                                >
                                    {auditorMutation.isPending ? <Spinner className="w-4 h-4 mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                                    Approve
                                </Button>
                                <Button
                                    variant="destructive"
                                    className="w-full"
                                    onClick={() => auditorMutation.mutate('REJECT')}
                                    disabled={isPending}
                                >
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Reject
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {/* Agency Actions */}
                    {showAgencyActions && (
                        <Card className="border-blue-200 bg-blue-50">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm">Your Action Required</CardTitle>
                                <CardDescription>Administrative Review</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <Button
                                    className="w-full bg-green-600 hover:bg-green-700"
                                    onClick={() => agencyMutation.mutate('APPROVE')}
                                    disabled={isPending}
                                >
                                    {agencyMutation.isPending ? <Spinner className="w-4 h-4 mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                                    Approve
                                </Button>
                                <Button
                                    variant="destructive"
                                    className="w-full"
                                    onClick={() => agencyMutation.mutate('REJECT')}
                                    disabled={isPending}
                                >
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Reject
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {/* Disburse Action */}
                    {showDisburseAction && (
                        <Card className="border-green-200 bg-green-50">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm">Your Action Required</CardTitle>
                                <CardDescription>Disbursement</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button
                                    className="w-full bg-green-600 hover:bg-green-700"
                                    onClick={() => setDisburseDialogOpen(true)}
                                >
                                    <Banknote className="w-4 h-4 mr-2" />
                                    Disburse Payment
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {/* Status info */}
                    {!showAuditorActions && !showAgencyActions && !showDisburseAction && (
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm">Status</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {isRejected ? (
                                    <div className="flex items-center gap-2 text-red-600">
                                        <XCircle className="w-5 h-5" />
                                        <span>Request was rejected</span>
                                    </div>
                                ) : isPaid ? (
                                    <div className="flex items-center gap-2 text-green-600">
                                        <CheckCircle2 className="w-5 h-5" />
                                        <span>Payment completed</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-yellow-600">
                                        <Clock className="w-5 h-5" />
                                        <span>Awaiting approval</span>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* Disburse Dialog */}
            <Dialog open={disburseDialogOpen} onOpenChange={setDisburseDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Disburse Payment</DialogTitle>
                        <DialogDescription>
                            Upload payment proof to complete disbursement
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="p-4 bg-slate-50 rounded-lg">
                            <p className="text-sm text-slate-600">Amount</p>
                            <p className="text-2xl font-bold">{formatCurrency(request.amount)}</p>
                        </div>

                        <div className="space-y-2">
                            <p className="text-sm font-medium">Payment Proof (Image) *</p>
                            <FileUploader
                                mode="multi"
                                value={paymentProofs}
                                onChange={(urls) => setPaymentProofs(urls as string[])}
                                accept="image"
                                maxFiles={3}
                                disabled={disburseMutation.isPending}
                            />
                            <p className="text-xs text-slate-500">At least 1 image required</p>
                        </div>

                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" onClick={() => setDisburseDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={() => disburseMutation.mutate()}
                                disabled={paymentProofs.length === 0 || disburseMutation.isPending}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                {disburseMutation.isPending ? <Spinner className="w-4 h-4 mr-2" /> : <Banknote className="w-4 h-4 mr-2" />}
                                Disburse
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
