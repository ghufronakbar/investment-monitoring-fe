'use client';

/**
 * Tickets List Page
 * Display tickets with status filter and role-based actions
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useProject, useOrganization } from '@/providers';
import { queryKeys } from '@/constants';
import { getTickets } from '@/services';
import { formatSLASeconds, slaStatusConfig } from '@/lib/sla';
import type { TicketStatus, TicketFilter, SLAReturn } from '@/types';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
    Ticket,
    Plus,
    MapPin,
    Clock,
    ArrowRight,
    AlertCircle,
    CheckCircle2,
    Loader2,
    UserCheck,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// Status badge variant mapping
const statusConfig: Record<TicketStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; icon: React.ComponentType<{ className?: string }> }> = {
    OPEN: { label: 'Open', variant: 'destructive', icon: AlertCircle },
    ASSIGNED: { label: 'Assigned', variant: 'secondary', icon: UserCheck },
    IN_PROGRESS: { label: 'In Progress', variant: 'default', icon: Loader2 },
    RESOLVED: { label: 'Resolved', variant: 'outline', icon: CheckCircle2 },
    CLOSED: { label: 'Closed', variant: 'outline', icon: CheckCircle2 },
};

function SLABadge({ sla }: { sla?: SLAReturn | null }) {
    if (!sla) {
        return null;
    }

    const config = slaStatusConfig[sla.status];

    return (
        <Badge variant="outline" className={cn('shrink-0', config.className)}>
            {config.label}
            {sla.status !== 'RESOLVED' && (
                <span className="ml-1 font-normal">
                    {formatSLASeconds(sla.remainingSeconds)}
                </span>
            )}
        </Badge>
    );
}

export default function TicketsPage() {
    const { projectId } = useProject();
    const { orgRole } = useOrganization();

    const [filter, setFilter] = useState<TicketFilter>('');

    const canCreate = orgRole === 'CONTRACTOR';
    // Fetch tickets
    const { data: tickets, isLoading, error } = useQuery({
        queryKey: queryKeys.tickets.list(projectId!, filter),
        queryFn: () => getTickets(projectId!, filter || undefined),
        enabled: !!projectId,
    });

    // Count tickets by status
    const statusCounts = tickets?.reduce((acc, t) => {
        const isOpen = ['OPEN', 'ASSIGNED', 'IN_PROGRESS'].includes(t.currentStatus);
        acc.open += isOpen ? 1 : 0;
        acc.closed += !isOpen ? 1 : 0;
        return acc;
    }, { open: 0, closed: 0 }) || { open: 0, closed: 0 };

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
                    <p className="text-red-500">Failed to load tickets</p>
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
                        <Ticket className="w-6 h-6" />
                        {orgRole === 'GOV_PARTNER' ? 'Assigned Tickets' : 'Issue Tickets'}
                    </h1>
                    <p className="text-slate-600">
                        {orgRole === 'GOV_PARTNER'
                            ? 'Tickets assigned to your organization'
                            : 'Track and resolve field issues'
                        }
                    </p>
                </div>
                {canCreate && (
                    <Link href={`/dashboard/${projectId}/tickets/create`}>
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Report Issue
                        </Button>
                    </Link>
                )}

                <Select value={filter} onValueChange={(v) => setFilter(v as TicketFilter)}>
                    <SelectTrigger className="w-40 bg-white text-black">
                        <SelectValue placeholder="All Tickets" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Tickets</SelectItem>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Stats & Filter */}
            <div className="flex gap-4 items-center">
                <Card className="flex-1">
                    <CardContent className="pt-4 pb-4">
                        <div className="flex items-center justify-around">
                            <div className="text-center">
                                <p className="text-2xl font-bold text-yellow-600">{statusCounts.open}</p>
                                <p className="text-xs text-slate-500">Open</p>
                            </div>
                            <div className="w-px h-8 bg-slate-200" />
                            <div className="text-center">
                                <p className="text-2xl font-bold text-green-600">{statusCounts.closed}</p>
                                <p className="text-xs text-slate-500">Closed</p>
                            </div>
                            <div className="w-px h-8 bg-slate-200" />
                            <div className="text-center">
                                <p className="text-2xl font-bold">{tickets?.length || 0}</p>
                                <p className="text-xs text-slate-500">Total</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>


            </div>

            {/* Tickets List */}
            <Card>
                <CardHeader>
                    <CardTitle>Tickets</CardTitle>
                    <CardDescription>
                        Click on a ticket to view details and activity
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {tickets && tickets.length > 0 ? (
                        <div className="space-y-3">
                            {tickets.map((ticket) => {
                                const config = statusConfig[ticket.currentStatus];
                                const StatusIcon = config.icon;

                                return (
                                    <Link
                                        key={ticket.id}
                                        href={`/dashboard/${projectId}/tickets/${ticket.id}`}
                                        className="block"
                                    >
                                        <div className="p-4 rounded-lg border hover:bg-slate-50 hover:border-slate-300 transition-colors">
                                            <div className="flex items-start gap-4">
                                                {/* Creator Avatar */}
                                                <Avatar className="h-10 w-10">
                                                    <AvatarFallback className="bg-primary/10 text-primary">
                                                        {ticket.creator.orgName.slice(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>

                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-medium">{ticket.title}</h3>
                                                        <Badge variant={config.variant} className="shrink-0">
                                                            <StatusIcon className={cn('w-3 h-3 mr-1', config.label === 'In Progress' && 'animate-spin')} />
                                                            {config.label}
                                                        </Badge>
                                                        <SLABadge sla={ticket.sla} />
                                                    </div>
                                                    <p className="text-sm text-slate-500 mt-1 line-clamp-1">{ticket.description}</p>
                                                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                                                        <span className="flex items-center gap-1">
                                                            <MapPin className="w-3 h-3" />
                                                            {ticket.location}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {new Date(ticket.createdAt).toLocaleDateString()}
                                                        </span>
                                                        {ticket.assignedTo && (
                                                            <span className="flex items-center gap-1">
                                                                <UserCheck className="w-3 h-3" />
                                                                {ticket.assignedTo.orgName}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Task link */}
                                                {ticket.taskTitle && (
                                                    <Badge variant="outline" className="shrink-0">
                                                        {ticket.taskTitle}
                                                    </Badge>
                                                )}

                                                <ArrowRight className="w-5 h-5 text-slate-400 shrink-0 self-center" />
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-slate-500">
                            <Ticket className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                            <p>No tickets found</p>
                            {canCreate && (
                                <Link href={`/dashboard/${projectId}/tickets/create`}>
                                    <Button variant="outline" className="mt-4">
                                        <Plus className="w-4 h-4 mr-2" />
                                        Report First Issue
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
