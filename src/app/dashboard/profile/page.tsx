'use client';

/**
 * User Profile Page
 * View and edit profile, change password
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import Link from 'next/link';

import { queryKeys } from '@/constants';
import { getProfile, updateProfile, changePassword } from '@/services';
import { isApiError, isValidationError } from '@/lib/api';
import { getOrgRoleDisplayName, getMemberRoleDisplayName } from '@/lib/role-helpers';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { FileUploader } from '@/components/ui/file-uploader';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    User,
    Mail,
    Building2,
    Shield,
    KeyRound,
    ArrowLeft,
    Save,
} from 'lucide-react';

// Profile form schema
const profileSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    imageUrl: z.string().url().optional().or(z.literal('')),
});

type ProfileFormData = z.infer<typeof profileSchema>;

// Password form schema
const passwordSchema = z.object({
    currentPassword: z.string().min(6, 'Password must be at least 6 characters'),
    newPassword: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
});

type PasswordFormData = z.infer<typeof passwordSchema>;

export default function ProfilePage() {
    const queryClient = useQueryClient();
    const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

    // Fetch profile
    const { data: profile, isLoading } = useQuery({
        queryKey: queryKeys.auth.profile(),
        queryFn: getProfile,
    });

    // Profile form
    const profileForm = useForm<ProfileFormData>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(profileSchema as any),
        values: {
            name: profile?.name || '',
            imageUrl: profile?.imageUrl || '',
        },
    });

    // Password form
    const passwordForm = useForm<PasswordFormData>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(passwordSchema as any),
        defaultValues: {
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
        },
    });

    // Update profile mutation
    const updateMutation = useMutation({
        mutationFn: updateProfile,
        onSuccess: () => {
            toast.success('Profile updated successfully!');
            queryClient.invalidateQueries({ queryKey: queryKeys.auth.profile() });
        },
        onError: (error) => {
            if (isValidationError(error)) {
                Object.entries(error.validationErrors).forEach(([field, message]) => {
                    profileForm.setError(field as keyof ProfileFormData, { message });
                });
            } else if (isApiError(error)) {
                toast.error(error.responseMessage);
            }
        },
    });

    // Change password mutation
    const passwordMutation = useMutation({
        mutationFn: changePassword,
        onSuccess: () => {
            toast.success('Password changed successfully!');
            setPasswordDialogOpen(false);
            passwordForm.reset();
        },
        onError: (error) => {
            if (isValidationError(error)) {
                Object.entries(error.validationErrors).forEach(([field, message]) => {
                    passwordForm.setError(field as keyof PasswordFormData, { message });
                });
            } else if (isApiError(error)) {
                toast.error(error.responseMessage);
            }
        },
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Spinner className="w-8 h-8" />
            </div>
        );
    }

    return (
        <div className="p-8 max-w-3xl mx-auto space-y-6">
            {/* Back Link */}
            <Link
                href="/dashboard"
                className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800"
            >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
            </Link>

            {/* Profile Header */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <Avatar className="w-20 h-20">
                            <AvatarImage src={profile?.imageUrl || undefined} />
                            <AvatarFallback className="text-2xl">
                                {profile?.name?.charAt(0).toUpperCase() || 'U'}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <CardTitle className="text-2xl">{profile?.name}</CardTitle>
                            <CardDescription className="flex items-center gap-2 mt-1">
                                <Mail className="w-4 h-4" />
                                {profile?.email}
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Edit Profile Form */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <User className="w-5 h-5" />
                        Edit Profile
                    </CardTitle>
                    <CardDescription>Update your personal information</CardDescription>
                </CardHeader>
                <CardContent>
                    <form
                        onSubmit={profileForm.handleSubmit((data) =>
                            updateMutation.mutate({
                                name: data.name,
                                imageUrl: data.imageUrl || undefined,
                            })
                        )}
                        className="space-y-4"
                    >
                        <div className="space-y-2">
                            <Label htmlFor="name">Name *</Label>
                            <Input
                                id="name"
                                {...profileForm.register('name')}
                                disabled={updateMutation.isPending}
                            />
                            {profileForm.formState.errors.name && (
                                <p className="text-sm text-red-500">
                                    {profileForm.formState.errors.name.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>Profile Photo</Label>
                            <FileUploader
                                mode="single"
                                accept="image"
                                value={profileForm.watch('imageUrl')}
                                onChange={(url) => profileForm.setValue('imageUrl', url as string)}
                                disabled={updateMutation.isPending}
                                placeholder="Upload profile photo"
                            />
                        </div>

                        <div className="flex justify-end gap-3">
                            <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button type="button" variant="outline">
                                        <KeyRound className="w-4 h-4 mr-2" />
                                        Change Password
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Change Password</DialogTitle>
                                        <DialogDescription>
                                            Enter your current password and a new password
                                        </DialogDescription>
                                    </DialogHeader>
                                    <form
                                        onSubmit={passwordForm.handleSubmit((data) =>
                                            passwordMutation.mutate({
                                                currentPassword: data.currentPassword,
                                                newPassword: data.newPassword,
                                            })
                                        )}
                                        className="space-y-4"
                                    >
                                        <div className="space-y-2">
                                            <Label htmlFor="currentPassword">Current Password *</Label>
                                            <Input
                                                id="currentPassword"
                                                type="password"
                                                {...passwordForm.register('currentPassword')}
                                                disabled={passwordMutation.isPending}
                                            />
                                            {passwordForm.formState.errors.currentPassword && (
                                                <p className="text-sm text-red-500">
                                                    {passwordForm.formState.errors.currentPassword.message}
                                                </p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="newPassword">New Password *</Label>
                                            <Input
                                                id="newPassword"
                                                type="password"
                                                {...passwordForm.register('newPassword')}
                                                disabled={passwordMutation.isPending}
                                            />
                                            {passwordForm.formState.errors.newPassword && (
                                                <p className="text-sm text-red-500">
                                                    {passwordForm.formState.errors.newPassword.message}
                                                </p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="confirmPassword">Confirm New Password *</Label>
                                            <Input
                                                id="confirmPassword"
                                                type="password"
                                                {...passwordForm.register('confirmPassword')}
                                                disabled={passwordMutation.isPending}
                                            />
                                            {passwordForm.formState.errors.confirmPassword && (
                                                <p className="text-sm text-red-500">
                                                    {passwordForm.formState.errors.confirmPassword.message}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex gap-2 justify-end">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => setPasswordDialogOpen(false)}
                                            >
                                                Cancel
                                            </Button>
                                            <Button type="submit" disabled={passwordMutation.isPending}>
                                                {passwordMutation.isPending ? (
                                                    <>
                                                        <Spinner className="w-4 h-4 mr-2" />
                                                        Changing...
                                                    </>
                                                ) : (
                                                    'Change Password'
                                                )}
                                            </Button>
                                        </div>
                                    </form>
                                </DialogContent>
                            </Dialog>

                            <Button type="submit" disabled={updateMutation.isPending}>
                                {updateMutation.isPending ? (
                                    <>
                                        <Spinner className="w-4 h-4 mr-2" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4 mr-2" />
                                        Save Changes
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Organization Memberships */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Building2 className="w-5 h-5" />
                        Your Organizations
                    </CardTitle>
                    <CardDescription>
                        Organizations you are a member of
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {profile?.memberships && profile.memberships.length > 0 ? (
                        <div className="space-y-3">
                            {profile.memberships.map((membership) => (
                                <div
                                    key={membership.id}
                                    className="flex items-center gap-4 p-3 rounded-lg border"
                                >
                                    <Avatar className="w-10 h-10">
                                        <AvatarImage src={membership.orgLogoUrl || undefined} />
                                        <AvatarFallback>
                                            <Building2 className="w-5 h-5" />
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium">{membership.orgName}</p>
                                        <p className="text-xs text-slate-500">
                                            {getOrgRoleDisplayName(membership.orgRole)}
                                        </p>
                                    </div>
                                    <Badge variant={membership.memberRole === 'ADMIN' ? 'default' : 'secondary'}>
                                        {membership.memberRole === 'ADMIN' && <Shield className="w-3 h-3 mr-1" />}
                                        {getMemberRoleDisplayName(membership.memberRole)}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-slate-500 py-8">
                            You are not a member of any organization.
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
