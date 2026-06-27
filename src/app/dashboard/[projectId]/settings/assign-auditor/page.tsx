'use client';

/**
 * Assign Auditor Page
 * For EXECUTING_AGENCY ADMIN
 */
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useProject, useOrganization } from '@/providers';
import { queryKeys } from '@/constants';
import { assignAuditor } from '@/services';
import { getRegisteredOrganizations } from '@/services/iam/organization.service';
import { getApiErrorMessage, isApiError, isValidationError } from '@/lib/api';

import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { OrganizationSelect } from '@/components/ui/organization-select';
import { ArrowLeft, FileCheck } from 'lucide-react';
import Link from 'next/link';

const assignSchema = z.object({
    auditorOrgId: z.string().min(1, 'Please select an auditor'),
});

type AssignFormData = z.infer<typeof assignSchema>;

export default function AssignAuditorPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { projectId } = useProject();
    const { orgRole, isAdmin } = useOrganization();

    const canAssign = orgRole === 'EXECUTING_AGENCY' && isAdmin;

    const { data: organizations = [] } = useQuery({
        queryKey: queryKeys.organizations.registered(),
        queryFn: getRegisteredOrganizations,
    });

    const form = useForm<AssignFormData>({
        resolver: zodResolver(assignSchema),
        defaultValues: { auditorOrgId: '' },
    });

    const mutation = useMutation({
        mutationFn: (data: AssignFormData) => assignAuditor(projectId!, data),
        onSuccess: () => {
            toast.success('Auditor assigned successfully!');
            queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId!) });
            router.push(`/dashboard/${projectId}/details`);
        },
        onError: (error) => {
            if (isValidationError(error)) {
                Object.entries(error.validationErrors).forEach(([field, message]) => {
                    form.setError(field as keyof AssignFormData, { message });
                });
            } else if (isApiError(error)) {
                toast.error(getApiErrorMessage(error));
            }
        },
    });

    if (!canAssign) {
        return (
            <div className="p-8">
                <Card className="max-w-md mx-auto text-center">
                    <CardHeader>
                        <CardTitle className="text-red-600">Unauthorized</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-slate-600 mb-4">
                            Only Executing Agency administrators can assign auditors.
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
                    <FileCheck className="w-6 h-6" />
                    Assign Auditor
                </h1>
                <p className="text-slate-600">Select an independent auditor for progress validation</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Select Auditor</CardTitle>
                    <CardDescription>
                        The auditor will validate progress submissions and approve payments.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
                        <OrganizationSelect
                            organizations={organizations}
                            filterRole="INDEPENDENT_AUDITOR"
                            value={form.watch('auditorOrgId')}
                            onChange={(value) => form.setValue('auditorOrgId', value, { shouldValidate: true })}
                            disabled={mutation.isPending}
                            placeholder="No auditors available"
                        />
                        {form.formState.errors.auditorOrgId && (
                            <p className="text-sm text-red-500">
                                {form.formState.errors.auditorOrgId.message}
                            </p>
                        )}

                        <div className="flex gap-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.push(`/dashboard/${projectId}/details`)}
                                disabled={mutation.isPending}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={mutation.isPending}>
                                {mutation.isPending ? (
                                    <>
                                        <Spinner className="w-4 h-4 mr-2" />
                                        Assigning...
                                    </>
                                ) : (
                                    'Assign Auditor'
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
