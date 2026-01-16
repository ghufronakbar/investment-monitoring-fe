'use client';

/**
 * Progress Logs Page
 * Shows all progress submissions with validation status
 */
import { useQuery } from '@tanstack/react-query';

import { useProject } from '@/providers';
import { queryKeys } from '@/constants';
import { getProgressLogs } from '@/services';

import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ClipboardList, CheckCircle2, XCircle, Clock } from 'lucide-react';

export default function LogsPage() {
    const { projectId } = useProject();

    const { data, isLoading, error } = useQuery({
        queryKey: queryKeys.monitoring.logs(projectId!),
        queryFn: () => getProgressLogs(projectId!),
        enabled: !!projectId,
    });

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
                    <p className="text-red-500">Failed to load progress logs</p>
                </CardContent>
            </Card>
        );
    }

    const logs = data || [];

    const approved = logs.filter((l) => l.validation?.isAccepted);
    const rejected = logs.filter((l) => l.validation && !l.validation.isAccepted);
    const pending = logs.filter((l) => !l.validation);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <ClipboardList className="w-6 h-6" />
                    Progress Logs
                </h1>
                <p className="text-slate-600">All progress submissions and their validation status</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6 text-center">
                        <p className="text-2xl font-bold">{logs.length}</p>
                        <p className="text-xs text-slate-500">Total</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6 text-center">
                        <p className="text-2xl font-bold text-green-600">{approved.length}</p>
                        <p className="text-xs text-slate-500">Approved</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6 text-center">
                        <p className="text-2xl font-bold text-red-600">{rejected.length}</p>
                        <p className="text-xs text-slate-500">Rejected</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6 text-center">
                        <p className="text-2xl font-bold text-yellow-600">{pending.length}</p>
                        <p className="text-xs text-slate-500">Pending</p>
                    </CardContent>
                </Card>
            </div>

            {/* Logs Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Submission History</CardTitle>
                    <CardDescription>Complete list of progress submissions</CardDescription>
                </CardHeader>
                <CardContent>
                    {logs.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Task</TableHead>
                                    <TableHead>Contractor</TableHead>
                                    <TableHead className="text-center">Claimed</TableHead>
                                    <TableHead className="text-center">Actual</TableHead>
                                    <TableHead className="text-center">Status</TableHead>
                                    <TableHead>Submitted</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {logs.map((log) => (
                                    <TableRow key={log.id}>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium">{log.snapshotTitle}</p>
                                                <p className="text-xs text-slate-500">Weight: {log.snapshotWeight}%</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                                        {log.vendorName?.slice(0, 2).toUpperCase() || 'CN'}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="text-sm">{log.vendorName}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="outline">{log.progressPercentage}%</Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {log.validation ? (
                                                <Badge
                                                    variant={log.validation.isAccepted ? 'default' : 'destructive'}
                                                >
                                                    {log.validation.realProgressPercentage}%
                                                </Badge>
                                            ) : (
                                                <span className="text-slate-400">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {log.validation ? (
                                                log.validation.isAccepted ? (
                                                    <Badge variant="default" className="bg-green-600 gap-1">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        Approved
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="destructive" className="gap-1">
                                                        <XCircle className="w-3 h-3" />
                                                        Rejected
                                                    </Badge>
                                                )
                                            ) : (
                                                <Badge variant="secondary" className="gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    Pending
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm text-slate-500">
                                            {new Date(log.createdAt).toLocaleDateString()}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center py-12 text-slate-500">
                            <ClipboardList className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                            <p>No progress submissions yet</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
