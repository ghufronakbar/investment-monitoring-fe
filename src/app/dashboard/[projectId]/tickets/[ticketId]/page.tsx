'use client';

/**
 * Ticket Detail Page
 * Show ticket info, evidence, and activity log timeline
 */
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useProject, useOrganization } from '@/providers';
import { queryKeys, invalidationMap } from '@/constants';
import { getTicketDetail, addTicketLog, assignTicket, closeTicket, getRegisteredOrganizations } from '@/services';
import { isApiError, isValidationError } from '@/lib/api';
import type { TicketStatus, AddTicketLogRequest } from '@/types';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    ArrowLeft,
    MapPin,
    Clock,
    CheckCircle2,
    UserCheck,
    MessageSquare,
    Send,
    Link as LinkIcon,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// Status config
const statusConfig: Record<TicketStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; color: string }> = {
    OPEN: { label: 'Open', variant: 'destructive', color: 'bg-red-500' },
    ASSIGNED: { label: 'Assigned', variant: 'secondary', color: 'bg-yellow-500' },
    IN_PROGRESS: { label: 'In Progress', variant: 'default', color: 'bg-blue-500' },
    RESOLVED: { label: 'Resolved', variant: 'outline', color: 'bg-green-500' },
    CLOSED: { label: 'Closed', variant: 'outline', color: 'bg-slate-500' },
};

// Log form schema
const logSchema = z.object({
    description: z.string().min(5, 'Description must be at least 5 characters'),
    newStatus: z.enum(['IN_PROGRESS', 'RESOLVED', '']).optional(),
});

type LogFormData = z.infer<typeof logSchema>;

export default function TicketDetailPage() {
    const params = useParams();
    const ticketId = params.ticketId as string;
    const queryClient = useQueryClient();
    const { projectId } = useProject();
    const { orgRole, isAdmin, orgId } = useOrganization();

    const [assignDialogOpen, setAssignDialogOpen] = useState(false);
    const [selectedOrgId, setSelectedOrgId] = useState('');

    // Permissions
    const canAddLog = orgRole === 'EXECUTING_AGENCY' || orgRole === 'GOV_PARTNER';
    const canAssign = orgRole === 'EXECUTING_AGENCY' && isAdmin;
    const canClose = orgRole === 'EXECUTING_AGENCY' && isAdmin;

    // Form
    const form = useForm<LogFormData>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(logSchema as any),
        defaultValues: {
            description: '',
            newStatus: '',
        },
    });

    // Fetch ticket detail
    const { data: ticket, isLoading, error } = useQuery({
        queryKey: queryKeys.tickets.detail(ticketId),
        queryFn: () => getTicketDetail(ticketId),
        enabled: !!ticketId,
    });

    // Fetch GOV_PARTNERS for assign
    const { data: orgsData } = useQuery({
        queryKey: ['organizations', 'registered'],
        queryFn: () => getRegisteredOrganizations(),
        enabled: canAssign,
    });

    const govPartners = orgsData?.filter((o) => o.role === 'GOV_PARTNER') || [];

    // Check if GOV_PARTNER is assigned to this ticket
    const isAssignedToMe = orgRole === 'GOV_PARTNER' && ticket?.assignedTo?.orgId === orgId;
    const canUpdateStatus = canAddLog && (orgRole === 'EXECUTING_AGENCY' || isAssignedToMe);

    // Add log mutation
    const addLogMutation = useMutation({
        mutationFn: (data: AddTicketLogRequest) => addTicketLog(ticketId, data),
        onSuccess: () => {
            toast.success('Log added successfully');
            queryClient.invalidateQueries({ queryKey: queryKeys.tickets.detail(ticketId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.tickets.list(projectId!) });
            form.reset();
        },
        onError: (error) => {
            if (isValidationError(error)) {
                Object.entries(error.validationErrors).forEach(([field, message]) => {
                    form.setError(field as keyof LogFormData, { message });
                });
            } else if (isApiError(error)) {
                toast.error(error.responseMessage);
            }
        },
    });

    // Assign mutation
    const assignMutation = useMutation({
        mutationFn: (orgId: string) => assignTicket(ticketId, { assignToOrgId: orgId }),
        onSuccess: () => {
            toast.success('Ticket assigned successfully');
            queryClient.invalidateQueries({ queryKey: queryKeys.tickets.detail(ticketId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.tickets.list(projectId!) });
            setAssignDialogOpen(false);
            setSelectedOrgId('');
        },
        onError: (error) => {
            if (isApiError(error)) {
                toast.error(error.responseMessage);
            }
        },
    });

    // Close mutation
    const closeMutation = useMutation({
        mutationFn: () => closeTicket(ticketId),
        onSuccess: () => {
            toast.success('Ticket closed successfully');
            invalidationMap.ticket(projectId!, ticketId).forEach((key) => {
                queryClient.invalidateQueries({ queryKey: key });
            });
        },
        onError: (error) => {
            if (isApiError(error)) {
                toast.error(error.responseMessage);
            }
        },
    });

    const handleAddLog = (data: LogFormData) => {
        addLogMutation.mutate({
            description: data.description,
            newStatus: data.newStatus === '' ? null : data.newStatus,
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Spinner className="w-8 h-8" />
            </div>
        );
    }

    if (error || !ticket) {
        return (
            <Card className="max-w-md mx-auto text-center">
                <CardContent className="pt-6">
                    <p className="text-red-500 mb-4">Ticket not found</p>
                    <Link href={`/dashboard/${projectId}/tickets`}>
                        <Button variant="outline">Back to Tickets</Button>
                    </Link>
                </CardContent>
            </Card>
        );
    }

    const config = statusConfig[ticket.currentStatus];
    const isClosed = ticket.currentStatus === 'CLOSED';
    const isResolved = ticket.currentStatus === 'RESOLVED';

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <Link
                    href={`/dashboard/${projectId}/tickets`}
                    className="text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1 mb-2"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Tickets
                </Link>
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold">{ticket.title}</h1>
                            <Badge variant={config.variant}>{config.label}</Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                            <span className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {ticket.location}
                            </span>
                            <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {new Date(ticket.createdAt).toLocaleString()}
                            </span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {canAssign && !isClosed && !ticket.assignedTo && (
                            <Button variant="outline" onClick={() => setAssignDialogOpen(true)}>
                                <UserCheck className="w-4 h-4 mr-2" />
                                Assign
                            </Button>
                        )}
                        {canClose && isResolved && (
                            <Button
                                variant="default"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => closeMutation.mutate()}
                                disabled={closeMutation.isPending}
                            >
                                {closeMutation.isPending ? <Spinner className="w-4 h-4 mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                                Close Ticket
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="col-span-2 space-y-6">
                    {/* Description */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Description</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="whitespace-pre-wrap">{ticket.description}</p>
                        </CardContent>
                    </Card>

                    {/* Evidence */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Evidence ({ticket.evidenceImageUrls.length})</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-3 gap-3">
                                {ticket.evidenceImageUrls.map((url, idx) => (
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
                        </CardContent>
                    </Card>

                    {/* Activity Log */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <MessageSquare className="w-5 h-5" />
                                Activity Log
                            </CardTitle>
                            <CardDescription>Timeline of all updates</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {ticket.logs?.map((log, idx) => (
                                    <div key={log.id} className="relative pl-6">
                                        {/* Timeline line */}
                                        {idx < (ticket.logs?.length || 0) - 1 && (
                                            <div className="absolute left-[9px] top-6 bottom-0 w-0.5 bg-slate-200" />
                                        )}
                                        {/* Dot */}
                                        <div className={cn(
                                            'absolute left-0 top-1.5 w-[18px] h-[18px] rounded-full border-2 border-white',
                                            log.newStatus ? statusConfig[log.newStatus].color : 'bg-slate-300'
                                        )} />

                                        <div className="pb-4">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-sm">{log.userName}</span>
                                                <span className="text-xs text-slate-500">({log.orgName})</span>
                                                <span className="text-xs text-slate-400">
                                                    {new Date(log.createdAt).toLocaleString()}
                                                </span>
                                            </div>
                                            <p className="text-sm mt-1">{log.description}</p>
                                            {log.previousStatus && log.newStatus && log.previousStatus !== log.newStatus && (
                                                <div className="flex items-center gap-2 mt-2">
                                                    <Badge variant="outline" className="text-xs">{log.previousStatus}</Badge>
                                                    <ArrowLeft className="w-3 h-3 rotate-180 text-slate-400" />
                                                    <Badge variant={statusConfig[log.newStatus].variant} className="text-xs">
                                                        {log.newStatus}
                                                    </Badge>
                                                </div>
                                            )}
                                            {log.attachmentUrl && (
                                                <a
                                                    href={log.attachmentUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                                                >
                                                    <LinkIcon className="w-3 h-3" />
                                                    Attachment
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Add Log Form */}
                            {canUpdateStatus && !isClosed && (
                                <form onSubmit={form.handleSubmit(handleAddLog)} className="mt-6 pt-6 border-t space-y-4">
                                    <div className="space-y-2">
                                        <Label>Add Comment/Update</Label>
                                        <Textarea
                                            placeholder="Describe your update..."
                                            rows={3}
                                            {...form.register('description')}
                                            disabled={addLogMutation.isPending}
                                        />
                                        {form.formState.errors.description && (
                                            <p className="text-sm text-red-500">{form.formState.errors.description.message}</p>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="flex-1">
                                            <Select
                                                value={form.watch('newStatus') || ''}
                                                onValueChange={(v) => form.setValue('newStatus', v as 'IN_PROGRESS' | 'RESOLVED' | '')}
                                                disabled={addLogMutation.isPending}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="No status change" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="no_change">No status change</SelectItem>
                                                    <SelectItem value="IN_PROGRESS">Mark In Progress</SelectItem>
                                                    <SelectItem value="RESOLVED">Mark Resolved</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <Button type="submit" disabled={addLogMutation.isPending}>
                                            {addLogMutation.isPending ? (
                                                <Spinner className="w-4 h-4 mr-2" />
                                            ) : (
                                                <Send className="w-4 h-4 mr-2" />
                                            )}
                                            Send
                                        </Button>
                                    </div>
                                </form>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                    {/* Creator */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm">Reported By</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-3">
                                <Avatar>
                                    <AvatarFallback className="bg-primary/10 text-primary">
                                        {ticket.creator.orgName.slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-medium text-sm">{ticket.creator.orgName}</p>
                                    <p className="text-xs text-slate-500">Contractor</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Assigned To */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm">Assigned To</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {ticket.assignedTo ? (
                                <div className="flex items-center gap-3">
                                    <Avatar>
                                        <AvatarFallback className="bg-green-100 text-green-700">
                                            {ticket.assignedTo.orgName.slice(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-medium text-sm">{ticket.assignedTo.orgName}</p>
                                        <p className="text-xs text-slate-500">Gov Partner</p>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-slate-500">Not assigned yet</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Related Task */}
                    {ticket.taskTitle && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm">Related Task</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Badge variant="outline">{ticket.taskTitle}</Badge>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* Assign Dialog */}
            <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Assign Ticket</DialogTitle>
                        <DialogDescription>
                            Select a Government Partner organization to handle this issue.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select organization" />
                            </SelectTrigger>
                            <SelectContent>
                                {govPartners.map((org) => (
                                    <SelectItem key={org.id} value={org.id}>
                                        {org.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={() => selectedOrgId && assignMutation.mutate(selectedOrgId)}
                                disabled={!selectedOrgId || assignMutation.isPending}
                            >
                                {assignMutation.isPending ? <Spinner className="w-4 h-4 mr-2" /> : null}
                                Assign
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
