'use client';

/**
 * Create Project Page  
 * Only accessible by GOV_SUPERVISOR ADMIN
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useOrganization } from '@/providers';
import { queryKeys } from '@/constants';
import { createProject } from '@/services';
import { getRegisteredOrganizations } from '@/services/iam/organization.service';
import { isApiError, isValidationError } from '@/lib/api';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { FileUploader } from '@/components/ui/file-uploader';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const createProjectSchema = z.object({
    name: z.string().min(3, 'Project name must be at least 3 characters'),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    contractFileUrl: z.string().url('Please upload a loan agreement document'),
    loanProviderId: z.string('Please select a loan provider'),
});

type CreateProjectFormData = z.infer<typeof createProjectSchema>;

export default function CreateProjectPage() {
    const router = useRouter();
    const { orgRole, isAdmin } = useOrganization();
    const [imageUrls, setImageUrls] = useState<string[]>([]);

    // Check authorization
    const canCreate = orgRole === 'GOV_SUPERVISOR' && isAdmin;

    // Get loan providers
    const { data: organizations } = useQuery({
        queryKey: queryKeys.organizations.registered(),
        queryFn: getRegisteredOrganizations,
    });

    const loanProviders = organizations?.filter((org) => org.role === 'LOAN_PROVIDER') || [];

    // Form setup
    const form = useForm<CreateProjectFormData>({
        resolver: zodResolver(createProjectSchema),
        defaultValues: {
            name: '',
            description: '',
            contractFileUrl: '',
            loanProviderId: '',
        },
    });

    // Create mutation
    const createMutation = useMutation({
        mutationFn: createProject,
        onSuccess: (data) => {
            toast.success('Project created successfully!');
            router.push(`/dashboard/${data.project.id}/overview`);
        },
        onError: (error) => {
            if (isValidationError(error)) {
                Object.entries(error.validationErrors).forEach(([field, message]) => {
                    form.setError(field as keyof CreateProjectFormData, { message });
                });
            } else if (isApiError(error)) {
                toast.error(error.responseMessage);
            }
        },
    });

    const onSubmit = (data: CreateProjectFormData) => {
        if (imageUrls.length === 0) {
            toast.error('Please upload at least one project image');
            return;
        }

        createMutation.mutate({
            ...data,
            imageUrls,
        });
    };

    // Unauthorized view
    if (!canCreate) {
        return (
            <div className="p-8">
                <Card className="max-w-md mx-auto text-center">
                    <CardHeader>
                        <CardTitle className="text-red-600">Unauthorized</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-slate-600 mb-4">
                            Only Government Supervisor administrators can create projects.
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
            {/* Header */}
            <div className="mb-6">
                <Link
                    href="/dashboard"
                    className="text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1 mb-2"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Projects
                </Link>
                <h1 className="text-2xl font-bold">Create New Project</h1>
                <p className="text-slate-600">Initialize a new G-to-G project with loan agreement</p>
            </div>

            {/* Form */}
            <Card>
                <CardHeader>
                    <CardTitle>Project Details</CardTitle>
                    <CardDescription>
                        Fill in the project information and attach the loan agreement document.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        {/* Project Name */}
                        <div className="space-y-2">
                            <Label htmlFor="name">Project Name *</Label>
                            <Input
                                id="name"
                                placeholder="e.g., MRT Jakarta Extension Phase 2"
                                {...form.register('name')}
                                disabled={createMutation.isPending}
                            />
                            {form.formState.errors.name && (
                                <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
                            )}
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <Label htmlFor="description">Description *</Label>
                            <Textarea
                                id="description"
                                placeholder="Describe the project scope, objectives, and expected outcomes..."
                                rows={4}
                                {...form.register('description')}
                                disabled={createMutation.isPending}
                            />
                            {form.formState.errors.description && (
                                <p className="text-sm text-red-500">{form.formState.errors.description.message}</p>
                            )}
                        </div>

                        {/* Loan Agreement Upload */}
                        <div className="space-y-2">
                            <Label>Loan Agreement Document *</Label>
                            <FileUploader
                                mode="single"
                                accept="pdf"
                                onChange={(url) => form.setValue('contractFileUrl', url as string, { shouldValidate: true })}
                                disabled={createMutation.isPending}
                                placeholder="Upload the loan agreement PDF document"
                            />
                            {form.formState.errors.contractFileUrl && (
                                <p className="text-sm text-red-500">
                                    {form.formState.errors.contractFileUrl.message}
                                </p>
                            )}
                        </div>

                        {/* Loan Provider */}
                        <div className="space-y-2">
                            <Label>Loan Provider *</Label>
                            <Select
                                onValueChange={(value) => form.setValue('loanProviderId', value, { shouldValidate: true })}
                                disabled={createMutation.isPending}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select loan provider organization" />
                                </SelectTrigger>
                                <SelectContent>
                                    {loanProviders.map((org) => (
                                        <SelectItem key={org.id} value={org.id}>
                                            {org.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {form.formState.errors.loanProviderId && (
                                <p className="text-sm text-red-500">
                                    {form.formState.errors.loanProviderId.message}
                                </p>
                            )}
                        </div>

                        {/* Project Images Upload */}
                        <div className="space-y-2">
                            <Label>Project Images *</Label>
                            <p className="text-sm text-slate-500">
                                Upload one or more images for the project (max 10)
                            </p>
                            <FileUploader
                                mode="multi"
                                accept="image"
                                maxFiles={10}
                                onChange={(urls) => setImageUrls(urls as string[])}
                                disabled={createMutation.isPending}
                            />
                        </div>

                        {/* Submit */}
                        <div className="flex gap-4 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.push('/dashboard')}
                                disabled={createMutation.isPending}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={createMutation.isPending}>
                                {createMutation.isPending ? (
                                    <>
                                        <Spinner className="w-4 h-4 mr-2" />
                                        Creating...
                                    </>
                                ) : (
                                    'Create Project'
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
