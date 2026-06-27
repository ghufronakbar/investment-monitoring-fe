'use client';

/**
 * Assign Government Partners Page
 * For EXECUTING_AGENCY ADMIN - Multi-select version
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useProject, useOrganization } from '@/providers';
import { queryKeys } from '@/constants';
import { assignGovPartners } from '@/services';
import { getRegisteredOrganizations } from '@/services/iam/organization.service';
import { getApiErrorMessage, isApiError } from '@/lib/api';
import { getOrgRoleDisplayName } from '@/lib/role-helpers';

import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Building } from 'lucide-react';
import Link from 'next/link';

export default function AssignPartnersPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { projectId, project } = useProject();
    const { orgRole, isAdmin } = useOrganization();

    const canAssign = orgRole === 'EXECUTING_AGENCY' && isAdmin;

    // Get current partner IDs
    const currentPartnerIds = project?.contract.govPartners?.map((p) => p.orgId) || [];
    const [selectedIds, setSelectedIds] = useState<string[]>(currentPartnerIds);

    const { data: organizations = [] } = useQuery({
        queryKey: queryKeys.organizations.registered(),
        queryFn: getRegisteredOrganizations,
    });

    const govPartners = organizations.filter((org) => org.role === 'GOV_PARTNER');

    const mutation = useMutation({
        mutationFn: () => assignGovPartners(projectId!, { govPartnerIds: selectedIds }),
        onSuccess: () => {
            toast.success('Government partners assigned successfully!');
            queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId!) });
            router.push(`/dashboard/${projectId}/details`);
        },
        onError: (error) => {
            if (isApiError(error)) {
                toast.error(getApiErrorMessage(error));
            }
        },
    });

    const togglePartner = (id: string) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
        );
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((word) => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    if (!canAssign) {
        return (
            <div className="p-8">
                <Card className="max-w-md mx-auto text-center">
                    <CardHeader>
                        <CardTitle className="text-red-600">Unauthorized</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-slate-600 mb-4">
                            Only Executing Agency administrators can assign government partners.
                        </p>
                        <Link href={`/dashboard/${projectId}/details`}>
                            <Button variant="outline">
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back to Details
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-lg mx-auto space-y-6">
            <div>
                <Link
                    href={`/dashboard/${projectId}/details`}
                    className="text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1 mb-2"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Details
                </Link>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Building className="w-6 h-6" />
                    Assign Government Partners
                </h1>
                <p className="text-slate-600">Select government agencies for issue resolution</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Select Partners</CardTitle>
                    <CardDescription>
                        Government partners (BPN, PLN, etc.) can be assigned tickets when issues arise.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {govPartners.length === 0 ? (
                            <div className="p-4 border rounded-lg text-center">
                                <Building className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                                <p className="text-slate-500 text-sm">
                                    No government partner organizations found.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {govPartners.map((org) => {
                                    const isSelected = selectedIds.includes(org.id);

                                    return (
                                        <button
                                            key={org.id}
                                            type="button"
                                            onClick={() => togglePartner(org.id)}
                                            disabled={mutation.isPending}
                                            className={`w-full flex items-center gap-3 p-3 border rounded-lg transition-all text-left ${isSelected
                                                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                                } ${mutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            {/* Checkbox */}
                                            <Checkbox
                                                checked={isSelected}
                                                onCheckedChange={() => togglePartner(org.id)}
                                                disabled={mutation.isPending}
                                                className="pointer-events-none"
                                            />

                                            {/* Avatar */}
                                            <Avatar className="h-10 w-10">
                                                <AvatarImage src={org.logoUrl || undefined} alt={org.name} />
                                                <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                                                    {getInitials(org.name)}
                                                </AvatarFallback>
                                            </Avatar>

                                            {/* Org Info */}
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-slate-900 truncate">{org.name}</p>
                                                <p className="text-xs text-slate-500">{getOrgRoleDisplayName(org.role)}</p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        <p className="text-sm text-slate-500">
                            Selected: <span className="font-medium">{selectedIds.length} partner(s)</span>
                        </p>

                        <div className="flex gap-4 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.push(`/dashboard/${projectId}/details`)}
                                disabled={mutation.isPending}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={() => mutation.mutate()}
                                disabled={mutation.isPending || selectedIds.length === 0}
                            >
                                {mutation.isPending ? (
                                    <>
                                        <Spinner className="w-4 h-4 mr-2" />
                                        Saving...
                                    </>
                                ) : (
                                    'Save Partners'
                                )}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
