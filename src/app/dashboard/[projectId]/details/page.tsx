'use client';

/**
 * Project Details Page
 * Shows project info and contract participants
 */
import { useProject, useOrganization } from '@/providers';
import { getOrgRoleDisplayName } from '@/lib/role-helpers';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    FolderKanban,
    Building2,
    FileText,
    Calendar,
    Image as ImageIcon,
    ExternalLink,
    Settings,
} from 'lucide-react';
import Link from 'next/link';

export default function ProjectDetailsPage() {
    const { project, projectId } = useProject();
    const { orgRole, isAdmin } = useOrganization();

    if (!project) return null;

    const { project: projectData, contract, settings } = project;

    // Check if user can edit settings (EXECUTING_AGENCY ADMIN)
    const canEditSettings = orgRole === 'EXECUTING_AGENCY' && isAdmin;

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold">Project Details</h1>
                    <p className="text-slate-600">View and manage project information</p>
                </div>
                {canEditSettings && (
                    <Link href={`/dashboard/${projectId}/settings`}>
                        <Button>
                            <Settings className="w-4 h-4 mr-2" />
                            Configure Settings
                        </Button>
                    </Link>
                )}
            </div>

            {/* Project Info */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FolderKanban className="w-5 h-5" />
                        {projectData.name}
                    </CardTitle>
                    <CardDescription>{projectData.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-slate-500">Project ID</p>
                            <p className="font-mono text-sm">{projectData.id}</p>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Created At</p>
                            <p className="flex items-center gap-1">
                                <Calendar className="w-4 h-4 text-slate-400" />
                                {new Date(projectData.createdAt).toLocaleDateString()}
                            </p>
                        </div>
                    </div>

                    {/* Loan Agreement */}
                    <div>
                        <p className="text-sm text-slate-500 mb-2">Loan Agreement Document</p>
                        <a
                            href={projectData.contractFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-primary hover:underline"
                        >
                            <FileText className="w-4 h-4" />
                            View Document
                            <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>

                    {/* Project Images */}
                    {projectData.imageUrls && projectData.imageUrls.length > 0 && (
                        <div>
                            <p className="text-sm text-slate-500 mb-2 flex items-center gap-1">
                                <ImageIcon className="w-4 h-4" />
                                Project Images
                            </p>
                            <div className="flex gap-2 overflow-x-auto pb-2">
                                {projectData.imageUrls.map((url, index) => (
                                    <a
                                        key={index}
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-shrink-0"
                                    >
                                        <img
                                            src={url}
                                            alt={`Project image ${index + 1}`}
                                            className="w-32 h-24 object-cover rounded-lg border hover:opacity-80 transition-opacity"
                                        />
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Project Settings */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Settings className="w-5 h-5" />
                        Project Settings
                    </CardTitle>
                    <CardDescription>Budget and timeline configuration</CardDescription>
                </CardHeader>
                <CardContent>
                    {settings ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <p className="text-sm text-slate-500">Start Date</p>
                                <p className="font-medium">{new Date(settings.startDate).toLocaleDateString()}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Baseline Deadline</p>
                                <p className="font-medium">
                                    {new Date(settings.baselineDeadline).toLocaleDateString()}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Total Budget</p>
                                <p className="font-medium">
                                    {settings.currency} {settings.totalBudget.toLocaleString()}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Currency</p>
                                <Badge variant="outline">{settings.currency}</Badge>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-slate-500">
                            <Settings className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                            <p>Settings not configured yet</p>
                            {canEditSettings && (
                                <Link href={`/dashboard/${projectId}/settings`}>
                                    <Button variant="outline" className="mt-4">
                                        Configure Now
                                    </Button>
                                </Link>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Contract Participants */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Building2 className="w-5 h-5" />
                        Contract Participants
                    </CardTitle>
                    <CardDescription>Organizations involved in this project</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Gov Supervisor */}
                        <ParticipantCard
                            label="Government Supervisor"
                            participant={contract.govSupervisor}
                        />

                        {/* Loan Provider */}
                        <ParticipantCard label="Loan Provider" participant={contract.loanProvider} />

                        {/* Executing Agency */}
                        <ParticipantCard
                            label="Executing Agency"
                            participant={contract.executingAgency}
                            canAssign={orgRole === 'GOV_SUPERVISOR' && isAdmin}
                            assignHref={`/dashboard/${projectId}/settings/assign-agency`}
                        />

                        {/* Vendor */}
                        <ParticipantCard
                            label="Contractor"
                            participant={contract.vendor}
                            canAssign={orgRole === 'EXECUTING_AGENCY' && isAdmin}
                            assignHref={`/dashboard/${projectId}/settings/assign-vendor`}
                            extra={contract.contractValue ? (
                                <p className="text-xs text-slate-500">
                                    Contract: {contract.contractValue.toLocaleString()}
                                </p>
                            ) : null}
                        />

                        {/* Auditor */}
                        <ParticipantCard
                            label="Independent Auditor"
                            participant={contract.auditor}
                            canAssign={orgRole === 'EXECUTING_AGENCY' && isAdmin}
                            assignHref={`/dashboard/${projectId}/settings/assign-auditor`}
                        />

                        {/* Gov Partners */}
                        {contract.govPartners && contract.govPartners.length > 0 ? (
                            contract.govPartners.map((partner) => (
                                <ParticipantCard
                                    key={partner.orgId}
                                    label="Government Partner"
                                    participant={partner}
                                />
                            ))
                        ) : (
                            <ParticipantCard
                                label="Government Partners"
                                participant={null}
                                canAssign={orgRole === 'EXECUTING_AGENCY' && isAdmin}
                                assignHref={`/dashboard/${projectId}/settings/assign-partners`}
                            />
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

interface ParticipantCardProps {
    label: string;
    participant: { orgId: string; orgName: string; orgRole: string; logoUrl: string | null } | null;
    canAssign?: boolean;
    assignHref?: string;
    extra?: React.ReactNode;
}

function ParticipantCard({ label, participant, canAssign, assignHref, extra }: ParticipantCardProps) {
    if (participant) {
        return (
            <div className="p-4 rounded-lg border bg-slate-50">
                <Badge variant="outline" className="mb-2">
                    {label}
                </Badge>
                <p className="font-medium">{participant.orgName}</p>
                <p className="text-xs text-slate-500">{getOrgRoleDisplayName(participant.orgRole)}</p>
                {extra}
            </div>
        );
    }

    return (
        <div className="p-4 rounded-lg border border-dashed bg-slate-50/50">
            <Badge variant="secondary" className="mb-2">
                {label}
            </Badge>
            <p className="text-slate-500 text-sm">Not assigned</p>
            {canAssign && assignHref && (
                <Link href={assignHref}>
                    <Button variant="outline" size="sm" className="mt-2">
                        Assign
                    </Button>
                </Link>
            )}
        </div>
    );
}
