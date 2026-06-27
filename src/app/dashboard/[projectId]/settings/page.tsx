'use client';

/**
 * Project Settings Page
 * Configure budget, timeline for EXECUTING_AGENCY ADMIN
 */
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useProject, useOrganization } from '@/providers';
import { queryKeys } from '@/constants';
import { configureSettings } from '@/services';
import { getApiErrorMessage, isApiError, isValidationError } from '@/lib/api';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { ArrowLeft, Settings } from 'lucide-react';
import Link from 'next/link';

const settingsSchema = z.object({
    startDate: z.string().min(1, 'Start date is required'),
    baselineDeadline: z.string().min(1, 'Baseline deadline is required'),
    totalBudget: z.coerce.number().int().positive('Budget must be greater than 0'),
    currency: z.string().min(1, 'Currency is required'),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

const currencies = ['IDR', 'USD', 'JPY', 'EUR'];

export default function ProjectSettingsPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { project, projectId } = useProject();
    const { orgRole, isAdmin } = useOrganization();

    // Check authorization
    const canEdit = orgRole === 'EXECUTING_AGENCY' && isAdmin;

    // Form setup with existing values
    const form = useForm<SettingsFormData>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(settingsSchema as any),
        defaultValues: {
            startDate: project?.settings?.startDate
                ? new Date(project.settings.startDate).toISOString().split('T')[0]
                : '',
            baselineDeadline: project?.settings?.baselineDeadline
                ? new Date(project.settings.baselineDeadline).toISOString().split('T')[0]
                : '',
            totalBudget: project?.settings?.totalBudget || 0,
            currency: project?.settings?.currency || 'IDR',
        },
    });

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: (data: SettingsFormData) =>
            configureSettings(projectId!, {
                startDate: new Date(data.startDate).toISOString(),
                baselineDeadline: new Date(data.baselineDeadline).toISOString(),
                totalBudget: data.totalBudget,
                currency: data.currency,
            }),
        onSuccess: () => {
            toast.success('Settings updated successfully!');
            queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId!) });
            router.push(`/dashboard/${projectId}/details`);
        },
        onError: (error) => {
            if (isValidationError(error)) {
                Object.entries(error.validationErrors).forEach(([field, message]) => {
                    form.setError(field as keyof SettingsFormData, { message });
                });
            } else if (isApiError(error)) {
                toast.error(getApiErrorMessage(error));
            }
        },
    });

    const onSubmit = (data: SettingsFormData) => {
        // Validate deadline > start date
        if (new Date(data.baselineDeadline) <= new Date(data.startDate)) {
            form.setError('baselineDeadline', {
                message: 'Deadline must be after start date',
            });
            return;
        }
        updateMutation.mutate(data);
    };

    // Unauthorized view
    if (!canEdit) {
        return (
            <div className="p-8">
                <Card className="max-w-md mx-auto text-center">
                    <CardHeader>
                        <CardTitle className="text-red-600">Unauthorized</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-slate-600 mb-4">
                            Only Executing Agency administrators can configure project settings.
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
        <div className="space-y-6">
            {/* Header */}
            <div>
                <Link
                    href={`/dashboard/${projectId}/details`}
                    className="text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1 mb-2"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Details
                </Link>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Settings className="w-6 h-6" />
                    Project Settings
                </h1>
                <p className="text-slate-600">Configure budget and timeline for this project</p>
            </div>

            {/* Form */}
            <Card>
                <CardHeader>
                    <CardTitle>Budget & Timeline</CardTitle>
                    <CardDescription>
                        These settings will be used for S-Curve calculations and progress tracking.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Start Date */}
                            <div className="space-y-2">
                                <Label htmlFor="startDate">Start Date *</Label>
                                <Input
                                    id="startDate"
                                    type="date"
                                    {...form.register('startDate')}
                                    disabled={updateMutation.isPending}
                                />
                                {form.formState.errors.startDate && (
                                    <p className="text-sm text-red-500">
                                        {form.formState.errors.startDate.message}
                                    </p>
                                )}
                            </div>

                            {/* Baseline Deadline */}
                            <div className="space-y-2">
                                <Label htmlFor="baselineDeadline">Baseline Deadline *</Label>
                                <Input
                                    id="baselineDeadline"
                                    type="date"
                                    {...form.register('baselineDeadline')}
                                    disabled={updateMutation.isPending}
                                />
                                {form.formState.errors.baselineDeadline && (
                                    <p className="text-sm text-red-500">
                                        {form.formState.errors.baselineDeadline.message}
                                    </p>
                                )}
                            </div>

                            {/* Total Budget */}
                            <div className="space-y-2">
                                <Label htmlFor="totalBudget">Total Budget *</Label>
                                <Input
                                    id="totalBudget"
                                    type="number"
                                    placeholder="1000000000"
                                    {...form.register('totalBudget')}
                                    disabled={updateMutation.isPending}
                                />
                                {form.formState.errors.totalBudget && (
                                    <p className="text-sm text-red-500">
                                        {form.formState.errors.totalBudget.message}
                                    </p>
                                )}
                            </div>

                            {/* Currency */}
                            <div className="space-y-2">
                                <Label>Currency *</Label>
                                <Select
                                    value={form.watch('currency')}
                                    onValueChange={(value) => form.setValue('currency', value)}
                                    disabled={updateMutation.isPending}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select currency" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {currencies.map((curr) => (
                                            <SelectItem key={curr} value={curr}>
                                                {curr}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {form.formState.errors.currency && (
                                    <p className="text-sm text-red-500">
                                        {form.formState.errors.currency.message}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Submit */}
                        <div className="flex gap-4 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.push(`/dashboard/${projectId}/details`)}
                                disabled={updateMutation.isPending}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={updateMutation.isPending}>
                                {updateMutation.isPending ? (
                                    <>
                                        <Spinner className="w-4 h-4 mr-2" />
                                        Saving...
                                    </>
                                ) : (
                                    'Save Settings'
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
