'use client';

/**
 * Create New Organization Page
 * Only accessible by GOV_SUPERVISOR and EXECUTING_AGENCY admins
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

import { useOrganization } from '@/providers';
import { queryKeys } from '@/constants';
import { createOrganization } from '@/services';
import { getApiErrorMessage, isApiError, isValidationError } from '@/lib/api';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { FileUploader } from '@/components/ui/file-uploader';
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
import {
    Building2,
    ArrowLeft,
    Shield,
} from 'lucide-react';
import Link from 'next/link';

// All role options
const ALL_ORG_ROLES = [
    { value: 'CONTRACTOR', label: 'Contractor' },
    { value: 'GOV_PARTNER', label: 'Government Partner' },
    { value: 'INDEPENDENT_AUDITOR', label: 'Independent Auditor' },
    { value: 'LOAN_PROVIDER', label: 'Loan Provider' },
    { value: 'EXECUTING_AGENCY', label: 'Executing Agency' },
];

// Roles that EXECUTING_AGENCY can create
const AGENCY_ALLOWED_ROLES = ['CONTRACTOR', 'GOV_PARTNER', 'INDEPENDENT_AUDITOR'];

// Get available roles based on creator's org role
function getAvailableRoles(creatorOrgRole: string | null) {
    if (creatorOrgRole === 'GOV_SUPERVISOR') {
        return ALL_ORG_ROLES;
    }
    if (creatorOrgRole === 'EXECUTING_AGENCY') {
        return ALL_ORG_ROLES.filter(role => AGENCY_ALLOWED_ROLES.includes(role.value));
    }
    return [];
}

// Form schema
const createOrgSchema = z.object({
    name: z.string().min(2, 'Organization name must be at least 2 characters'),
    role: z.enum(['CONTRACTOR', 'GOV_PARTNER', 'INDEPENDENT_AUDITOR', 'LOAN_PROVIDER', 'EXECUTING_AGENCY']),
    logoUrl: z.string().url().optional().or(z.literal('')),
    adminName: z.string().min(2, 'Admin name must be at least 2 characters'),
    adminEmail: z.string().email('Invalid email address'),
});

type CreateOrgFormData = z.infer<typeof createOrgSchema>;

export default function CreateOrganizationPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { orgId, orgRole, isAdmin } = useOrganization();

    // Check authorization
    const canCreateOrg = (orgRole === 'GOV_SUPERVISOR' || orgRole === 'EXECUTING_AGENCY') && isAdmin;

    // Form
    const form = useForm<CreateOrgFormData>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(createOrgSchema as any),
        defaultValues: {
            name: '',
            role: 'CONTRACTOR',
            logoUrl: '',
            adminName: '',
            adminEmail: '',
        },
    });

    // Create mutation
    const mutation = useMutation({
        mutationFn: (data: CreateOrgFormData) =>
            createOrganization(orgId!, {
                name: data.name,
                role: data.role,
                logoUrl: data.logoUrl || undefined,
                adminName: data.adminName,
                adminEmail: data.adminEmail,
            }),
        onSuccess: (response) => {
            toast.success(`Organization "${response.organization.name}" created successfully!`);
            queryClient.invalidateQueries({ queryKey: queryKeys.organizations.registered() });
            router.push('/dashboard/organization');
        },
        onError: (error) => {
            if (isValidationError(error)) {
                Object.entries(error.validationErrors).forEach(([field, message]) => {
                    form.setError(field as keyof CreateOrgFormData, { message });
                });
            } else if (isApiError(error)) {
                toast.error(getApiErrorMessage(error));
            }
        },
    });


    // Access denied
    if (!canCreateOrg) {
        return (
            <div className="p-8 max-w-2xl mx-auto">
                <Card>
                    <CardContent className="py-12 text-center">
                        <Shield className="w-16 h-16 mx-auto mb-4 text-red-300" />
                        <h2 className="text-xl font-semibold text-red-600 mb-2">Access Denied</h2>
                        <p className="text-slate-500 mb-4">
                            Only Government Supervisor or Executing Agency admins can create new organizations.
                        </p>
                        <Link href="/dashboard">
                            <Button variant="outline">
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back to Dashboard
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-2xl mx-auto">
            {/* Back Link */}
            <Link
                href="/dashboard/organization"
                className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 mb-6"
            >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Organization
            </Link>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Building2 className="w-5 h-5" />
                        Create New Organization
                    </CardTitle>
                    <CardDescription>
                        Register a new organization in the system. The first admin will receive an invitation email.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form
                        onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
                        className="space-y-6"
                    >
                        {/* Organization Info */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-slate-700 border-b pb-2">
                                Organization Information
                            </h3>

                            <div className="space-y-2">
                                <Label htmlFor="name">Organization Name *</Label>
                                <Input
                                    id="name"
                                    placeholder="PT. Example Indonesia"
                                    {...form.register('name')}
                                    disabled={mutation.isPending}
                                />
                                {form.formState.errors.name && (
                                    <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="role">Organization Role *</Label>
                                <Select
                                    value={form.watch('role')}
                                    onValueChange={(value) => form.setValue('role', value as CreateOrgFormData['role'])}
                                    disabled={mutation.isPending}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {getAvailableRoles(orgRole).map((role) => (
                                            <SelectItem key={role.value} value={role.value}>
                                                {role.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {form.formState.errors.role && (
                                    <p className="text-sm text-red-500">{form.formState.errors.role.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label>Logo (Optional)</Label>
                                <FileUploader
                                    mode="single"
                                    accept="image"
                                    value={form.watch('logoUrl')}
                                    onChange={(url) => form.setValue('logoUrl', url as string)}
                                    disabled={mutation.isPending}
                                    placeholder="Upload organization logo"
                                />
                            </div>
                        </div>

                        {/* Admin Info */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-slate-700 border-b pb-2">
                                First Admin Information
                            </h3>
                            <p className="text-sm text-slate-500">
                                This person will be the first admin of the organization and will receive an invitation email.
                            </p>

                            <div className="space-y-2">
                                <Label htmlFor="adminName">Admin Name *</Label>
                                <Input
                                    id="adminName"
                                    placeholder="John Doe"
                                    {...form.register('adminName')}
                                    disabled={mutation.isPending}
                                />
                                {form.formState.errors.adminName && (
                                    <p className="text-sm text-red-500">{form.formState.errors.adminName.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="adminEmail">Admin Email *</Label>
                                <Input
                                    id="adminEmail"
                                    type="email"
                                    placeholder="john@example.com"
                                    {...form.register('adminEmail')}
                                    disabled={mutation.isPending}
                                />
                                {form.formState.errors.adminEmail && (
                                    <p className="text-sm text-red-500">{form.formState.errors.adminEmail.message}</p>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 justify-end pt-4">
                            <Link href="/dashboard/organization">
                                <Button type="button" variant="outline" disabled={mutation.isPending}>
                                    Cancel
                                </Button>
                            </Link>
                            <Button type="submit" disabled={mutation.isPending}>
                                {mutation.isPending ? (
                                    <>
                                        <Spinner className="w-4 h-4 mr-2" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <Building2 className="w-4 h-4 mr-2" />
                                        Create Organization
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
