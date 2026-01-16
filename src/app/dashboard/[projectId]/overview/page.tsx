'use client';

/**
 * Project Overview Dashboard
 * Comprehensive view of project status with stats, S-Curve, and quick actions
 */
import { useQuery } from '@tanstack/react-query';

import { useProject, useOrganization } from '@/providers';
import { queryKeys } from '@/constants';
import { getDashboardStats, getSCurveDashboard } from '@/services';
import { getOrgRoleDisplayName } from '@/lib/role-helpers';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    FolderKanban,
    Ticket,
    CreditCard,
    BarChart3,
    Building2,
    Calendar,
    Shield,
    TrendingUp,
    AlertTriangle,
    CheckCircle2,
    Clock,
    ArrowRight,
    FileText,
    Banknote,
} from 'lucide-react';
import Link from 'next/link';

// Format currency
function formatCurrency(amount: string | number, currency = 'IDR'): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '-';
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(num);
}

// Format compact number
function formatCompact(amount: string | number): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '-';
    if (num >= 1e12) return (num / 1e12).toFixed(1) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toString();
}

export default function ProjectOverviewPage() {
    const { orgRole, orgName, isAdmin } = useOrganization();
    const { project, projectId } = useProject();

    // Fetch dashboard stats
    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: queryKeys.dashboard.stats(projectId!),
        queryFn: () => getDashboardStats(projectId!),
        enabled: !!projectId,
    });

    // Fetch S-Curve data
    const { data: scurve, isLoading: scurveLoading } = useQuery({
        queryKey: queryKeys.dashboard.scurve(projectId!),
        queryFn: () => getSCurveDashboard(projectId!),
        enabled: !!projectId,
    });

    if (!project) return null;

    const { project: projectData, contract, settings } = project;

    // Calculate days until deadline
    const daysUntilDeadline = settings
        ? Math.ceil((new Date(settings.baselineDeadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;

    // Budget percentage
    const budgetPercent = stats && parseFloat(stats.totalBudget) > 0
        ? (parseFloat(stats.disbursedAmount) / parseFloat(stats.totalBudget)) * 100
        : 0;

    // Latest S-Curve values
    const latestDataPoint = scurve?.dataPoints?.[scurve.dataPoints.length - 1];
    const planProgress = latestDataPoint?.plan ?? 0;
    const actualProgress = latestDataPoint?.actual ?? 0;
    const progressDeviation = actualProgress - planProgress;

    // Quick actions based on role
    const getQuickActions = () => {
        switch (orgRole) {
            case 'CONTRACTOR':
                return [
                    { label: 'Submit Progress', href: `/dashboard/${projectId}/submit-progress`, icon: TrendingUp, color: 'bg-blue-500' },
                    { label: 'Report Issue', href: `/dashboard/${projectId}/tickets/create`, icon: Ticket, color: 'bg-yellow-500' },
                    { label: 'Request Payment', href: `/dashboard/${projectId}/finance/request`, icon: CreditCard, color: 'bg-green-500' },
                ];
            case 'EXECUTING_AGENCY':
                return [
                    { label: 'View Tasks', href: `/dashboard/${projectId}/monitoring/tasks`, icon: FileText, color: 'bg-blue-500' },
                    { label: 'Manage Tickets', href: `/dashboard/${projectId}/tickets`, icon: Ticket, color: 'bg-yellow-500' },
                    { label: 'Payment Requests', href: `/dashboard/${projectId}/finance/requests`, icon: CreditCard, color: 'bg-green-500' },
                ];
            case 'INDEPENDENT_AUDITOR':
                return [
                    { label: 'Validate Progress', href: `/dashboard/${projectId}/validations`, icon: CheckCircle2, color: 'bg-blue-500' },
                    { label: 'Payment Requests', href: `/dashboard/${projectId}/finance/requests`, icon: Banknote, color: 'bg-green-500' },
                ];
            case 'LOAN_PROVIDER':
                return [
                    { label: 'Payment Requests', href: `/dashboard/${projectId}/finance/requests`, icon: CreditCard, color: 'bg-green-500' },
                ];
            case 'GOV_PARTNER':
                return [
                    { label: 'Assigned Tickets', href: `/dashboard/${projectId}/tickets`, icon: Ticket, color: 'bg-yellow-500' },
                ];
            default:
                return [
                    { label: 'View Tasks', href: `/dashboard/${projectId}/monitoring/tasks`, icon: FileText, color: 'bg-blue-500' },
                ];
        }
    };

    const quickActions = getQuickActions();

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold">{projectData.name}</h1>
                    <p className="text-slate-600">{projectData.description}</p>
                </div>
                {isAdmin && orgRole === 'EXECUTING_AGENCY' && (
                    <Link href={`/dashboard/${projectId}/settings`}>
                        <Button variant="outline">
                            Settings
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </Link>
                )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Physical Progress */}
                <Card className={cn(
                    progressDeviation >= 0 ? 'border-green-200' : 'border-red-200'
                )}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">
                            Physical Progress
                        </CardTitle>
                        <BarChart3 className={cn(
                            'w-4 h-4',
                            progressDeviation >= 0 ? 'text-green-500' : 'text-red-500'
                        )} />
                    </CardHeader>
                    <CardContent>
                        {statsLoading ? (
                            <Spinner className="w-6 h-6" />
                        ) : (
                            <>
                                <p className="text-2xl font-bold">
                                    {stats?.physicalProgress?.toFixed(1) ?? actualProgress.toFixed(1)}%
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                    {progressDeviation >= 0 ? (
                                        <Badge variant="outline" className="text-green-600 bg-green-50">
                                            <TrendingUp className="w-3 h-3 mr-1" />
                                            On Track
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-red-600 bg-red-50">
                                            <AlertTriangle className="w-3 h-3 mr-1" />
                                            {Math.abs(progressDeviation).toFixed(1)}% Behind
                                        </Badge>
                                    )}
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Open Tickets */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">
                            Open Issues
                        </CardTitle>
                        <Ticket className="w-4 h-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        {statsLoading ? (
                            <Spinner className="w-6 h-6" />
                        ) : (
                            <>
                                <p className="text-2xl font-bold">
                                    {stats?.ticketStats ? stats.ticketStats.open + stats.ticketStats.inProgress : 0}
                                </p>
                                <p className="text-xs text-slate-500">
                                    {stats?.ticketStats?.resolved ?? 0} resolved, {stats?.ticketStats?.closed ?? 0} closed
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Budget */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">
                            Budget Disbursed
                        </CardTitle>
                        <CreditCard className="w-4 h-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        {statsLoading ? (
                            <Spinner className="w-6 h-6" />
                        ) : (
                            <>
                                <p className="text-2xl font-bold">
                                    {stats?.currency} {formatCompact(stats?.disbursedAmount ?? '0')}
                                </p>
                                <div className="mt-1">
                                    <Progress value={budgetPercent} className="h-1.5" />
                                    <p className="text-xs text-slate-500 mt-1">
                                        of {formatCurrency(stats?.totalBudget ?? '0', stats?.currency)} ({budgetPercent.toFixed(1)}%)
                                    </p>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Deadline */}
                <Card className={cn(
                    daysUntilDeadline !== null && daysUntilDeadline < 30 && 'border-yellow-200'
                )}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">
                            Deadline
                        </CardTitle>
                        <Calendar className={cn(
                            'w-4 h-4',
                            daysUntilDeadline !== null && daysUntilDeadline < 30 ? 'text-yellow-500' : 'text-slate-400'
                        )} />
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">
                            {settings
                                ? new Date(settings.baselineDeadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                                : '-'}
                        </p>
                        {daysUntilDeadline !== null && (
                            <p className={cn(
                                'text-xs',
                                daysUntilDeadline < 0 ? 'text-red-500' :
                                    daysUntilDeadline < 30 ? 'text-yellow-600' : 'text-slate-500'
                            )}>
                                {daysUntilDeadline < 0
                                    ? `${Math.abs(daysUntilDeadline)} days overdue`
                                    : `${daysUntilDeadline} days remaining`}
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* S-Curve & Quick Actions */}
            <div className="grid grid-cols-3 gap-6">
                {/* S-Curve Chart */}
                <Card className="col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5" />
                            S-Curve Progress
                        </CardTitle>
                        <CardDescription>Plan vs Actual Progress Over Time</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {scurveLoading ? (
                            <div className="flex items-center justify-center h-64">
                                <Spinner className="w-8 h-8" />
                            </div>
                        ) : scurve?.dataPoints && scurve.dataPoints.length > 0 ? (
                            <div className="space-y-4">
                                {/* Line Chart */}
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={scurve.dataPoints} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                            <XAxis
                                                dataKey="date"
                                                tick={{ fontSize: 11 }}
                                                tickFormatter={(value) => {
                                                    const date = new Date(value);
                                                    return `${date.getDate()}/${date.getMonth() + 1}`;
                                                }}
                                            />
                                            <YAxis
                                                domain={[0, 100]}
                                                tick={{ fontSize: 11 }}
                                                tickFormatter={(value) => `${value}%`}
                                            />
                                            <Tooltip
                                                formatter={(value: number) => [`${value.toFixed(1)}%`]}
                                                labelFormatter={(label) => new Date(label).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            />
                                            <Legend />
                                            <Line
                                                type="monotone"
                                                dataKey="plan"
                                                name="Planned"
                                                stroke="#3b82f6"
                                                strokeWidth={2}
                                                dot={false}
                                                activeDot={{ r: 4 }}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="actual"
                                                name="Actual"
                                                stroke="#22c55e"
                                                strokeWidth={2}
                                                dot={false}
                                                activeDot={{ r: 4 }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Deviation indicator */}
                                <div className={cn(
                                    'p-3 rounded-lg flex items-center justify-between',
                                    progressDeviation >= 0 ? 'bg-green-50' : 'bg-red-50'
                                )}>
                                    <div className="flex items-center gap-2">
                                        {progressDeviation >= 0 ? (
                                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                                        ) : (
                                            <AlertTriangle className="w-5 h-5 text-red-600" />
                                        )}
                                        <span className={cn(
                                            'font-medium',
                                            progressDeviation >= 0 ? 'text-green-700' : 'text-red-700'
                                        )}>
                                            {progressDeviation >= 0
                                                ? `On Track (+${progressDeviation.toFixed(1)}%)`
                                                : `Behind Schedule (${progressDeviation.toFixed(1)}%)`}
                                        </span>
                                    </div>
                                    <Link
                                        href={`/dashboard/${projectId}/monitoring/s-curve`}
                                        className="text-sm text-primary hover:underline flex items-center gap-1"
                                    >
                                        View Details
                                        <ArrowRight className="w-4 h-4" />
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                                <BarChart3 className="w-12 h-12 text-slate-300 mb-4" />
                                <p>No progress data available yet</p>
                                <p className="text-sm">Start by creating tasks and submitting progress</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Quick Actions</CardTitle>
                        <CardDescription>Common tasks for your role</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {quickActions.map((action) => (
                            <Link key={action.href} href={action.href}>
                                <Button variant="outline" className="w-full justify-start gap-3">
                                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', action.color)}>
                                        <action.icon className="w-4 h-4 text-white" />
                                    </div>
                                    {action.label}
                                    <ArrowRight className="w-4 h-4 ml-auto text-slate-400" />
                                </Button>
                            </Link>
                        ))}
                    </CardContent>
                </Card>
            </div>

            {/* Contract Participants */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Building2 className="w-5 h-5" />
                        Contract Participants
                    </CardTitle>
                    <CardDescription>
                        Organizations involved in this project
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        {/* Gov Supervisor */}
                        <div className={cn(
                            'p-3 rounded-lg border text-center',
                            contract.govSupervisor ? 'bg-slate-50' : 'border-dashed bg-slate-50/50'
                        )}>
                            <Badge variant="outline" className="mb-2 text-xs">Gov Supervisor</Badge>
                            <p className={cn('text-sm font-medium truncate', !contract.govSupervisor && 'text-slate-400')}>
                                {contract.govSupervisor?.orgName || 'Not assigned'}
                            </p>
                        </div>

                        {/* Loan Provider */}
                        <div className={cn(
                            'p-3 rounded-lg border text-center',
                            contract.loanProvider ? 'bg-slate-50' : 'border-dashed bg-slate-50/50'
                        )}>
                            <Badge variant="outline" className="mb-2 text-xs">Loan Provider</Badge>
                            <p className={cn('text-sm font-medium truncate', !contract.loanProvider && 'text-slate-400')}>
                                {contract.loanProvider?.orgName || 'Not assigned'}
                            </p>
                        </div>

                        {/* Executing Agency */}
                        <div className={cn(
                            'p-3 rounded-lg border text-center',
                            contract.executingAgency ? 'bg-slate-50' : 'border-dashed bg-slate-50/50'
                        )}>
                            <Badge variant="outline" className="mb-2 text-xs">Executing Agency</Badge>
                            <p className={cn('text-sm font-medium truncate', !contract.executingAgency && 'text-slate-400')}>
                                {contract.executingAgency?.orgName || 'Not assigned'}
                            </p>
                        </div>

                        {/* Contractor */}
                        <div className={cn(
                            'p-3 rounded-lg border text-center',
                            contract.vendor ? 'bg-slate-50' : 'border-dashed bg-slate-50/50'
                        )}>
                            <Badge variant="outline" className="mb-2 text-xs">Contractor</Badge>
                            <p className={cn('text-sm font-medium truncate', !contract.vendor && 'text-slate-400')}>
                                {contract.vendor?.orgName || 'Not assigned'}
                            </p>
                        </div>

                        {/* Auditor */}
                        <div className={cn(
                            'p-3 rounded-lg border text-center',
                            contract.auditor ? 'bg-slate-50' : 'border-dashed bg-slate-50/50'
                        )}>
                            <Badge variant="outline" className="mb-2 text-xs">Auditor</Badge>
                            <p className={cn('text-sm font-medium truncate', !contract.auditor && 'text-slate-400')}>
                                {contract.auditor?.orgName || 'Not assigned'}
                            </p>
                        </div>

                        {/* Gov Partners */}
                        <div className={cn(
                            'p-3 rounded-lg border text-center',
                            contract.govPartners?.length ? 'bg-slate-50' : 'border-dashed bg-slate-50/50'
                        )}>
                            <Badge variant="outline" className="mb-2 text-xs">Gov Partners</Badge>
                            <p className={cn('text-sm font-medium', !contract.govPartners?.length && 'text-slate-400')}>
                                {contract.govPartners?.length
                                    ? `${contract.govPartners.length} assigned`
                                    : 'None'}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Your Access */}
            <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="py-4">
                    <div className="flex items-center gap-3">
                        <Shield className="w-5 h-5 text-primary" />
                        <div>
                            <CardTitle className="text-sm text-primary">Your Access</CardTitle>
                            <CardDescription className="text-primary/70">
                                You are viewing this project as <strong>{getOrgRoleDisplayName(orgRole)}</strong> from <strong>{orgName}</strong>
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
            </Card>
        </div>
    );
}
