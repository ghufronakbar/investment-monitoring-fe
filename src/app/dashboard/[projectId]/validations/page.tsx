'use client';

/**
 * Validations Queue Page
 * For INDEPENDENT_AUDITOR to view pending validations
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useProject, useOrganization } from '@/providers';
import { queryKeys } from '@/constants';
import { getPendingValidations, getTasks } from '@/services';
import type { TaskItem } from '@/types';

import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
    FileCheck,
    Clock,
    ArrowRight,
    Image as ImageIcon,
    ListTodo,
    ChevronRight,
    ChevronDown,
    Calendar,
    Weight,
    CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function ValidationsPage() {
    const { projectId } = useProject();
    const { orgRole } = useOrganization();

    const isAuditor = orgRole === 'INDEPENDENT_AUDITOR';

    // State for task tree
    const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

    // Fetch pending validations
    const { data, isLoading, error } = useQuery({
        queryKey: queryKeys.monitoring.pending(projectId!),
        queryFn: () => getPendingValidations(projectId!),
        enabled: !!projectId && isAuditor,
    });

    // Fetch tasks tree
    const { data: tasksData, isLoading: tasksLoading } = useQuery({
        queryKey: queryKeys.monitoring.tasks(projectId!),
        queryFn: () => getTasks(projectId!),
        enabled: !!projectId && isAuditor,
    });

    const toggleExpand = (taskId: string) => {
        setExpandedTasks((prev) => {
            const next = new Set(prev);
            if (next.has(taskId)) {
                next.delete(taskId);
            } else {
                next.add(taskId);
            }
            return next;
        });
    };

    const expandAll = () => {
        if (!tasksData?.tasks) return;
        const allIds = new Set<string>();
        const collectIds = (tasks: TaskItem[]) => {
            tasks.forEach((task) => {
                if (task.children && task.children.length > 0) {
                    allIds.add(task.id);
                    collectIds(task.children);
                }
            });
        };
        collectIds(tasksData.tasks);
        setExpandedTasks(allIds);
    };

    const collapseAll = () => {
        setExpandedTasks(new Set());
    };

    // Render task recursively (read-only)
    const renderTask = (task: TaskItem, depth = 0) => {
        const hasChildren = task.children && task.children.length > 0;
        const isExpanded = expandedTasks.has(task.id);
        const isOverdue = new Date(task.deadline) < new Date() && !task.isCompleted;

        return (
            <div key={task.id}>
                <div
                    className={cn(
                        'flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors',
                        depth > 0 && 'ml-6 border-l-2 border-slate-200 pl-4'
                    )}
                >
                    {/* Expand/Collapse */}
                    <button
                        onClick={() => hasChildren && toggleExpand(task.id)}
                        className={cn(
                            'w-6 h-6 flex items-center justify-center rounded',
                            hasChildren ? 'hover:bg-slate-200 cursor-pointer' : 'cursor-default'
                        )}
                    >
                        {hasChildren ? (
                            isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-slate-500" />
                            ) : (
                                <ChevronRight className="w-4 h-4 text-slate-500" />
                            )
                        ) : (
                            <div className="w-2 h-2 rounded-full bg-slate-300" />
                        )}
                    </button>

                    {/* Task info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900 truncate">{task.title}</span>
                            {task.isCompleted && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}
                            {task.isLeaf && <Badge variant="outline" className="text-xs">Leaf</Badge>}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                            <span className="flex items-center gap-1">
                                <Weight className="w-3 h-3" />
                                {task.weight}%
                            </span>
                            <span className={cn('flex items-center gap-1', isOverdue && 'text-red-500')}>
                                <Calendar className="w-3 h-3" />
                                {new Date(task.deadline).toLocaleDateString()}
                            </span>
                        </div>
                    </div>

                    {/* Progress */}
                    <div className="w-24 shrink-0">
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-500">Actual</span>
                            <span className="font-medium">{task.actualPercentage}%</span>
                        </div>
                        <Progress value={task.actualPercentage} className="h-2" />
                    </div>

                    {/* Claimed */}
                    <div className="w-16 shrink-0 text-xs text-center">
                        <div className="text-slate-500">Claimed</div>
                        <div className="font-medium">{task.claimedPercentage}%</div>
                    </div>
                </div>

                {/* Children */}
                {hasChildren && isExpanded && (
                    <div className="mt-1">
                        {task.children!.map((child) => renderTask(child, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    if (!isAuditor) {
        return (
            <Card className="max-w-md mx-auto text-center">
                <CardHeader>
                    <CardTitle className="text-red-600">Unauthorized</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-slate-600">Only auditors can access this page.</p>
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

    if (error) {
        return (
            <Card className="max-w-md mx-auto text-center">
                <CardContent className="pt-6">
                    <p className="text-red-500">Failed to load validations</p>
                </CardContent>
            </Card>
        );
    }

    const pendingLogs = data || [];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <FileCheck className="w-6 h-6" />
                    Validation Queue
                </h1>
                <p className="text-slate-600">Review progress submissions from contractors</p>
            </div>

            {/* Summary */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-yellow-100">
                            <Clock className="w-6 h-6 text-yellow-600" />
                        </div>
                        <div>
                            <p className="text-3xl font-bold">{pendingLogs.length}</p>
                            <p className="text-slate-500">Pending Validations</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Pending List */}
            <Card>
                <CardHeader>
                    <CardTitle>Pending Submissions</CardTitle>
                    <CardDescription>
                        Click on a submission to review and validate
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {pendingLogs.length > 0 ? (
                        <div className="space-y-3">
                            {pendingLogs.map((log) => (
                                <Link
                                    key={log.id}
                                    href={`/dashboard/${projectId}/validations/${log.id}`}
                                    className="block"
                                >
                                    <div className="p-4 rounded-lg border hover:bg-slate-50 hover:border-slate-300 transition-colors">
                                        <div className="flex items-start gap-4">
                                            {/* Vendor Avatar */}
                                            <Avatar className="h-10 w-10">
                                                <AvatarFallback className="bg-primary/10 text-primary">
                                                    {log.vendorName?.slice(0, 2).toUpperCase() || 'CN'}
                                                </AvatarFallback>
                                            </Avatar>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-medium">{log.snapshotTitle}</h3>
                                                <p className="text-sm text-slate-500 mt-1 line-clamp-2">{log.report}</p>
                                                <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                                                    <span>{log.vendorName}</span>
                                                    <span>•</span>
                                                    <span>{new Date(log.createdAt).toLocaleDateString()}</span>
                                                    <span>•</span>
                                                    <span className="flex items-center gap-1">
                                                        <ImageIcon className="w-3 h-3" />
                                                        {log.evidenceImageUrls.length} photo(s)
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Claimed */}
                                            <div className="text-right shrink-0">
                                                <Badge variant="outline" className="text-lg font-bold">
                                                    {log.progressPercentage}%
                                                </Badge>
                                                <p className="text-xs text-slate-500 mt-1">Claimed</p>
                                            </div>

                                            <ArrowRight className="w-5 h-5 text-slate-400 shrink-0 self-center" />
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-slate-500">
                            <FileCheck className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                            <p>No pending validations</p>
                            <p className="text-sm text-slate-400 mt-1">All submissions have been reviewed</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Tasks Tree (Informational) */}
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <ListTodo className="w-5 h-5" />
                                Work Breakdown Structure
                            </CardTitle>
                            <CardDescription>
                                Reference view of all tasks and their progress
                            </CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={expandAll}>
                                Expand All
                            </Button>
                            <Button variant="outline" size="sm" onClick={collapseAll}>
                                Collapse All
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {tasksLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Spinner className="w-6 h-6" />
                        </div>
                    ) : tasksData?.tasks && tasksData.tasks.length > 0 ? (
                        <div className="space-y-1">
                            {tasksData.tasks.map((task) => renderTask(task))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-slate-500">
                            <ListTodo className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                            <p>No tasks available</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
