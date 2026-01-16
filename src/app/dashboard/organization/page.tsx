'use client';

/**
 * Organization Detail Page
 * Shows organization info, members list, edit and invite functionality
 */
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

import { useOrganization } from '@/providers';
import { queryKeys } from '@/constants';
import { getOrganization, getOrganizationMembers, inviteMember, updateOrganization } from '@/services';
import { getOrgRoleDisplayName, getMemberRoleDisplayName } from '@/lib/role-helpers';
import { isApiError, isValidationError } from '@/lib/api';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Building2,
    Users,
    UserPlus,
    Mail,
    Shield,
    Crown,
    Pencil,
    Save,
} from 'lucide-react';

// Invite form schema
const inviteSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
});

type InviteFormData = z.infer<typeof inviteSchema>;

// Edit org schema
const editOrgSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    logoUrl: z.string().url().optional().or(z.literal('')),
});

type EditOrgFormData = z.infer<typeof editOrgSchema>;

export default function OrganizationPage() {
    const queryClient = useQueryClient();
    const { orgId, isAdmin, memberRole, orgRole, orgName, setActiveOrganization, organizations } = useOrganization();
    const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);

    // Fetch organization detail
    const { data: org, isLoading: orgLoading } = useQuery({
        queryKey: queryKeys.organizations.detail(orgId!),
        queryFn: () => getOrganization(orgId!),
        enabled: !!orgId,
    });

    // Fetch members
    const { data: members, isLoading: membersLoading } = useQuery({
        queryKey: queryKeys.organizations.members(orgId!),
        queryFn: () => getOrganizationMembers(orgId!),
        enabled: !!orgId,
    });

    // Invite form
    const inviteForm = useForm<InviteFormData>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(inviteSchema as any),
        defaultValues: {
            name: '',
            email: '',
        },
    });

    // Edit org form
    const editForm = useForm<EditOrgFormData>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(editOrgSchema as any),
        defaultValues: {
            name: '',
            logoUrl: '',
        },
    });

    // Set edit form values when org data loads
    useEffect(() => {
        if (org) {
            editForm.reset({
                name: org.name,
                logoUrl: org.logoUrl || '',
            });
        }
    }, [org, editForm]);

    // Invite mutation
    const inviteMutation = useMutation({
        mutationFn: (data: InviteFormData) => inviteMember(orgId!, data),
        onSuccess: () => {
            toast.success('Member invited successfully!');
            queryClient.invalidateQueries({ queryKey: queryKeys.organizations.members(orgId!) });
            setInviteDialogOpen(false);
            inviteForm.reset();
        },
        onError: (error) => {
            if (isValidationError(error)) {
                Object.entries(error.validationErrors).forEach(([field, message]) => {
                    inviteForm.setError(field as keyof InviteFormData, { message });
                });
            } else if (isApiError(error)) {
                toast.error(error.responseMessage);
            }
        },
    });

    // Update org mutation
    const updateMutation = useMutation({
        mutationFn: (data: EditOrgFormData) => updateOrganization(orgId!, {
            name: data.name,
            logoUrl: data.logoUrl || undefined,
        }),
        onSuccess: (updatedOrg) => {
            toast.success('Organization updated successfully!');
            queryClient.invalidateQueries({ queryKey: queryKeys.organizations.detail(orgId!) });
            queryClient.invalidateQueries({ queryKey: queryKeys.organizations.my() });
            setEditDialogOpen(false);

            // Update active organization in context if org name changed
            const updatedActive = organizations.find(o => o.orgId === orgId);
            if (updatedActive) {
                setActiveOrganization({
                    ...updatedActive,
                    orgName: updatedOrg.name,
                    orgLogoUrl: updatedOrg.logoUrl,
                });
            }
        },
        onError: (error) => {
            if (isValidationError(error)) {
                Object.entries(error.validationErrors).forEach(([field, message]) => {
                    editForm.setError(field as keyof EditOrgFormData, { message });
                });
            } else if (isApiError(error)) {
                toast.error(error.responseMessage);
            }
        },
    });

    const isLoading = orgLoading || membersLoading;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Spinner className="w-8 h-8" />
            </div>
        );
    }

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-6">
            {/* Organization Header */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden">
                                {org?.logoUrl ? (
                                    <img src={org.logoUrl} alt={org.name} className="w-16 h-16 rounded-lg object-cover" />
                                ) : (
                                    <Building2 className="w-8 h-8 text-primary" />
                                )}
                            </div>
                            <div>
                                <CardTitle className="text-2xl">{org?.name || orgName}</CardTitle>
                                <CardDescription className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline">{getOrgRoleDisplayName(orgRole)}</Badge>
                                    {isAdmin && (
                                        <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                                            <Crown className="w-3 h-3 mr-1" />
                                            Admin
                                        </Badge>
                                    )}
                                </CardDescription>
                            </div>
                        </div>
                        {isAdmin && (
                            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline">
                                        <Pencil className="w-4 h-4 mr-2" />
                                        Edit
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Edit Organization</DialogTitle>
                                        <DialogDescription>
                                            Update your organization name and logo
                                        </DialogDescription>
                                    </DialogHeader>
                                    <form
                                        onSubmit={editForm.handleSubmit((data) => updateMutation.mutate(data))}
                                        className="space-y-4"
                                    >
                                        <div className="space-y-2">
                                            <Label htmlFor="orgName">Organization Name *</Label>
                                            <Input
                                                id="orgName"
                                                {...editForm.register('name')}
                                                disabled={updateMutation.isPending}
                                            />
                                            {editForm.formState.errors.name && (
                                                <p className="text-sm text-red-500">
                                                    {editForm.formState.errors.name.message}
                                                </p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Logo</Label>
                                            <FileUploader
                                                mode="single"
                                                accept="image"
                                                value={editForm.watch('logoUrl')}
                                                onChange={(url) => editForm.setValue('logoUrl', url as string)}
                                                disabled={updateMutation.isPending}
                                                placeholder="Upload organization logo"
                                            />
                                        </div>
                                        <div className="flex gap-2 justify-end">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => setEditDialogOpen(false)}
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
                                                    <>
                                                        <Save className="w-4 h-4 mr-2" />
                                                        Save Changes
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        )}
                    </div>
                </CardHeader>
            </Card>

            {/* Members Section */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="w-5 h-5" />
                                Members
                            </CardTitle>
                            <CardDescription>
                                {members?.length || 0} member(s) in this organization
                            </CardDescription>
                        </div>
                        {isAdmin && (
                            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button>
                                        <UserPlus className="w-4 h-4 mr-2" />
                                        Invite Member
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Invite New Member</DialogTitle>
                                        <DialogDescription>
                                            Send an invitation to join your organization
                                        </DialogDescription>
                                    </DialogHeader>
                                    <form
                                        onSubmit={inviteForm.handleSubmit((data) => inviteMutation.mutate(data))}
                                        className="space-y-4"
                                    >
                                        <div className="space-y-2">
                                            <Label htmlFor="name">Name *</Label>
                                            <Input
                                                id="name"
                                                placeholder="John Doe"
                                                {...inviteForm.register('name')}
                                                disabled={inviteMutation.isPending}
                                            />
                                            {inviteForm.formState.errors.name && (
                                                <p className="text-sm text-red-500">
                                                    {inviteForm.formState.errors.name.message}
                                                </p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="email">Email *</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                placeholder="john@example.com"
                                                {...inviteForm.register('email')}
                                                disabled={inviteMutation.isPending}
                                            />
                                            {inviteForm.formState.errors.email && (
                                                <p className="text-sm text-red-500">
                                                    {inviteForm.formState.errors.email.message}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex gap-2 justify-end">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => setInviteDialogOpen(false)}
                                            >
                                                Cancel
                                            </Button>
                                            <Button type="submit" disabled={inviteMutation.isPending}>
                                                {inviteMutation.isPending ? (
                                                    <>
                                                        <Spinner className="w-4 h-4 mr-2" />
                                                        Sending...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Mail className="w-4 h-4 mr-2" />
                                                        Send Invite
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {members && members.length > 0 ? (
                        <div className="space-y-3">
                            {members.map((member) => (
                                <div
                                    key={member.id}
                                    className="flex items-center gap-4 p-3 rounded-lg border"
                                >
                                    <Avatar>
                                        <AvatarImage src={member.imageUrl || undefined} />
                                        <AvatarFallback>
                                            {member.name.charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">{member.name}</p>
                                        <p className="text-sm text-slate-500 truncate">{member.email}</p>
                                    </div>
                                    <Badge variant={member.memberRole === 'ADMIN' ? 'default' : 'secondary'}>
                                        {member.memberRole === 'ADMIN' && <Shield className="w-3 h-3 mr-1" />}
                                        {getMemberRoleDisplayName(member.memberRole)}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-slate-500">
                            <Users className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                            <p>No members found</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
