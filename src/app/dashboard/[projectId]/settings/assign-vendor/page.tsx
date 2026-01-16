'use client';

/**
 * Assign Vendor (Contractor) Page
 * For EXECUTING_AGENCY ADMIN
 * Pre-condition: Project settings must be configured first
 */
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useProject, useOrganization } from '@/providers';
import { queryKeys } from '@/constants';
import { assignVendor } from '@/services';
import { getRegisteredOrganizations } from '@/services/iam/organization.service';
import { isApiError, isValidationError } from '@/lib/api';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { OrganizationSelect } from '@/components/ui/organization-select';
import { FileUploader } from '@/components/ui/file-uploader';
import { ArrowLeft, HardHat, AlertTriangle, Settings } from 'lucide-react';
import Link from 'next/link';

export default function AssignVendorPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { projectId, project } = useProject();
    const { orgRole, isAdmin } = useOrganization();

    const canAssign = orgRole === 'EXECUTING_AGENCY' && isAdmin;
    const settings = project?.settings;
    const hasSettings = !!settings;
    const totalBudget = settings?.totalBudget || 0;
    const currency = settings?.currency || 'IDR';

    // Dynamic schema based on totalBudget
    const assignSchema = z.object({
        vendorOrgId: z.string().min(1, 'Please select a contractor'),
        contractValue: z.coerce
            .number()
            .int('Must be a whole number')
            .positive('Contract value must be greater than 0')
            .refine(
                (val) => val < totalBudget,
                `Contract value must be less than total budget (${currency} ${totalBudget.toLocaleString()})`
            ),
        contractDocUrl: z.string().url('Please upload a contract document'),
    });

    type AssignFormData = z.infer<typeof assignSchema>;

    const { data: organizations = [] } = useQuery({
        queryKey: queryKeys.organizations.registered(),
        queryFn: getRegisteredOrganizations,
    });

    const form = useForm<AssignFormData>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(assignSchema as any),
        defaultValues: { vendorOrgId: '', contractValue: 0, contractDocUrl: '' },
    });

    const mutation = useMutation({
        mutationFn: (data: AssignFormData) => assignVendor(projectId!, data),
        onSuccess: () => {
            toast.success('Contractor assigned successfully!');
            queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId!) });
            router.push(`/dashboard/${projectId}/details`);
        },
        onError: (error) => {
            if (isValidationError(error)) {
                Object.entries(error.validationErrors).forEach(([field, message]) => {
                    form.setError(field as keyof AssignFormData, { message });
                });
            } else if (isApiError(error)) {
                toast.error(error.responseMessage);
            }
        },
    });

    // Unauthorized view
    if (!canAssign) {
        return (
            <div className="p-8">
                <Card className="max-w-md mx-auto text-center">
                    <CardHeader>
                        <CardTitle className="text-red-600">Unauthorized</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-slate-600 mb-4">
                            Only Executing Agency administrators can assign contractors.
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
                    <HardHat className="w-6 h-6" />
                    Assign Contractor
                </h1>
                <p className="text-slate-600">Select the tender winner and set contract details</p>
            </div>

            {/* Warning if settings not configured */}
            {!hasSettings && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Project Settings Required</AlertTitle>
                    <AlertDescription>
                        You must configure project settings (budget, timeline) before assigning a contractor.
                        <Link href={`/dashboard/${projectId}/settings`}>
                            <Button variant="outline" size="sm" className="mt-2 gap-1">
                                <Settings className="w-4 h-4" />
                                Configure Settings
                            </Button>
                        </Link>
                    </AlertDescription>
                </Alert>
            )}

            <Card className={!hasSettings ? 'opacity-50 pointer-events-none' : ''}>
                <CardHeader>
                    <CardTitle>Contract Details</CardTitle>
                    <CardDescription>
                        The contractor will be able to view tasks and submit progress.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
                        {/* Contractor Select */}
                        <OrganizationSelect
                            label="Contractor *"
                            organizations={organizations}
                            filterRole="CONTRACTOR"
                            value={form.watch('vendorOrgId')}
                            onChange={(value) => form.setValue('vendorOrgId', value, { shouldValidate: true })}
                            disabled={mutation.isPending || !hasSettings}
                            placeholder="No contractors available"
                        />
                        {form.formState.errors.vendorOrgId && (
                            <p className="text-sm text-red-500">
                                {form.formState.errors.vendorOrgId.message}
                            </p>
                        )}

                        {/* Contract Value */}
                        <div className="space-y-2">
                            <Label htmlFor="contractValue">Contract Value *</Label>
                            <Input
                                id="contractValue"
                                type="number"
                                placeholder="1000000000"
                                {...form.register('contractValue')}
                                disabled={mutation.isPending || !hasSettings}
                            />
                            {hasSettings && (
                                <p className="text-xs text-slate-500">
                                    Maximum: {currency} {totalBudget.toLocaleString()} (total project budget)
                                </p>
                            )}
                            {form.formState.errors.contractValue && (
                                <p className="text-sm text-red-500">
                                    {form.formState.errors.contractValue.message}
                                </p>
                            )}
                        </div>

                        {/* Contract Document Upload */}
                        <div className="space-y-2">
                            <Label>Contract Document *</Label>
                            <FileUploader
                                mode="single"
                                accept="pdf"
                                onChange={(url) => form.setValue('contractDocUrl', url as string, { shouldValidate: true })}
                                disabled={mutation.isPending || !hasSettings}
                                placeholder="Upload the contract PDF document"
                            />
                            {form.formState.errors.contractDocUrl && (
                                <p className="text-sm text-red-500">
                                    {form.formState.errors.contractDocUrl.message}
                                </p>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.push(`/dashboard/${projectId}/details`)}
                                disabled={mutation.isPending}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={mutation.isPending || !hasSettings}>
                                {mutation.isPending ? (
                                    <>
                                        <Spinner className="w-4 h-4 mr-2" />
                                        Assigning...
                                    </>
                                ) : (
                                    'Assign Contractor'
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
