'use client';

/**
 * Assign Executing Agency Page
 * For GOV_SUPERVISOR ADMIN to assign an executing agency
 */
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useProject, useOrganization } from '@/providers';
import { queryKeys } from '@/constants';
import { assignExecutingAgency } from '@/services';
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
import { ArrowLeft, Building2 } from 'lucide-react';
import Link from 'next/link';

const assignSchema = z.object({
    executingAgencyId: z.string().min(1, 'Please select an executing agency'),
});

type AssignFormData = z.infer<typeof assignSchema>;

export default function AssignAgencyPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { projectId } = useProject();
    const { orgRole, isAdmin } = useOrganization();

    // Check authorization
    const canAssign = orgRole === 'GOV_SUPERVISOR' && isAdmin;

    // Get organizations
    const { data: organizations = [] } = useQuery({
        queryKey: queryKeys.organizations.registered(),
        queryFn: getRegisteredOrganizations,
    });

    // Form
    const form = useForm<AssignFormData>({
        resolver: zodResolver(assignSchema),
        defaultValues: { executingAgencyId: '' },
    });

    // Mutation
    const mutation = useMutation({
        mutationFn: (data: AssignFormData) =>
            assignExecutingAgency(projectId!, { executingAgencyId: data.executingAgencyId }),
        onSuccess: () => {
            toast.success('Executing agency assigned successfully!');
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
                            Only Government Supervisor administrators can assign executing agencies.
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
                    <Building2 className="w-6 h-6" />
                    Assign Executing Agency
                </h1>
                <p className="text-slate-600">Select an organization to manage this project</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Select Organization</CardTitle>
                    <CardDescription>
                        The executing agency will be responsible for project setup and management.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
                        <OrganizationSelect
                            organizations={organizations}
                            filterRole="EXECUTING_AGENCY"
                            value={form.watch('executingAgencyId')}
                            onChange={(value) => form.setValue('executingAgencyId', value, { shouldValidate: true })}
                            disabled={mutation.isPending}
                            placeholder="No executing agencies available"
                        />
                        {form.formState.errors.executingAgencyId && (
                            <p className="text-sm text-red-500">
                                {form.formState.errors.executingAgencyId.message}
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
                                    'Assign'
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
