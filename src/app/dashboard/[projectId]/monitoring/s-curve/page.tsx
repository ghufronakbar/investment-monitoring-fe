'use client';

/**
 * S-Curve Visualization Page
 * Shows planned vs actual progress chart
 */
import { useQuery } from '@tanstack/react-query';

import { useProject } from '@/providers';
import { queryKeys } from '@/constants';
import { getSCurveData } from '@/services';

import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    TrendingUp,
    Target,
    CheckCircle2,
    XCircle,
    Clock,
    BarChart3,
} from 'lucide-react';

export default function SCurvePage() {
    const { projectId } = useProject();

    const { data, isLoading, error } = useQuery({
        queryKey: queryKeys.monitoring.scurve(projectId!),
        queryFn: () => getSCurveData(projectId!),
        enabled: !!projectId,
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Spinner className="w-8 h-8" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <Card className="max-w-md mx-auto text-center">
                <CardContent className="pt-6">
                    <p className="text-red-500">Failed to load S-Curve data</p>
                </CardContent>
            </Card>
        );
    }

    const variance = data.actualProgress - data.plannedProgress;
    const isAhead = variance >= 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <TrendingUp className="w-6 h-6" />
                    S-Curve Progress
                </h1>
                <p className="text-slate-600">Planned vs Actual progress visualization</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-100">
                                <Target className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{data.plannedProgress.toFixed(1)}%</p>
                                <p className="text-xs text-slate-500">Planned Progress</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-green-100">
                                <TrendingUp className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{data.actualProgress.toFixed(1)}%</p>
                                <p className="text-xs text-slate-500">Actual Progress</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${isAhead ? 'bg-green-100' : 'bg-red-100'}`}>
                                <BarChart3 className={`w-5 h-5 ${isAhead ? 'text-green-600' : 'text-red-600'}`} />
                            </div>
                            <div>
                                <p className={`text-2xl font-bold ${isAhead ? 'text-green-600' : 'text-red-600'}`}>
                                    {variance > 0 ? '+' : ''}{variance.toFixed(1)}%
                                </p>
                                <p className="text-xs text-slate-500">Variance</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-slate-100">
                                <Clock className="w-5 h-5 text-slate-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{data.totalLogs}</p>
                                <p className="text-xs text-slate-500">Total Submissions</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Progress Comparison */}
            <Card>
                <CardHeader>
                    <CardTitle>Progress Comparison</CardTitle>
                    <CardDescription>Visual comparison of planned vs actual progress</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Planned Progress</span>
                            <span className="font-medium text-blue-600">{data.plannedProgress.toFixed(1)}%</span>
                        </div>
                        <Progress value={data.plannedProgress} className="h-4 bg-blue-100" />
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Actual Progress</span>
                            <span className="font-medium text-green-600">{data.actualProgress.toFixed(1)}%</span>
                        </div>
                        <Progress value={data.actualProgress} className="h-4" />
                    </div>

                    <div className="flex justify-center pt-4">
                        <Badge variant={isAhead ? 'default' : 'destructive'} className="text-sm px-4 py-1">
                            {isAhead ? 'On Track / Ahead of Schedule' : 'Behind Schedule'}
                        </Badge>
                    </div>
                </CardContent>
            </Card>

            {/* Submission Stats */}
            <Card>
                <CardHeader>
                    <CardTitle>Validation Stats</CardTitle>
                    <CardDescription>Progress submission validation breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="p-4 rounded-lg bg-green-50">
                            <CheckCircle2 className="w-8 h-8 mx-auto text-green-600 mb-2" />
                            <p className="text-2xl font-bold text-green-600">{data.approvedLogs}</p>
                            <p className="text-xs text-slate-500">Approved</p>
                        </div>
                        <div className="p-4 rounded-lg bg-red-50">
                            <XCircle className="w-8 h-8 mx-auto text-red-600 mb-2" />
                            <p className="text-2xl font-bold text-red-600">{data.rejectedLogs}</p>
                            <p className="text-xs text-slate-500">Rejected</p>
                        </div>
                        <div className="p-4 rounded-lg bg-yellow-50">
                            <Clock className="w-8 h-8 mx-auto text-yellow-600 mb-2" />
                            <p className="text-2xl font-bold text-yellow-600">
                                {data.totalLogs - data.approvedLogs - data.rejectedLogs}
                            </p>
                            <p className="text-xs text-slate-500">Pending</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Task Details */}
            {data.taskDetails && data.taskDetails.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Task Progress Details</CardTitle>
                        <CardDescription>Individual task progress breakdown</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {data.taskDetails.map((task) => (
                                <div key={task.taskId} className="flex items-center gap-4 p-3 rounded-lg bg-slate-50">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">{task.taskTitle}</p>
                                        <p className="text-xs text-slate-500">
                                            Weight: {task.plannedWeight}% • Deadline: {new Date(task.deadline).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="w-32 shrink-0">
                                        <Progress value={task.actualPercentage} className="h-2" />
                                        <div className="flex justify-between text-xs mt-1">
                                            <span className="text-slate-500">Claimed: {task.claimedPercentage}%</span>
                                            <span className="font-medium">{task.actualPercentage}%</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
