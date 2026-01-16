'use client';

/**
 * No Organization Screen
 * Shown when user has no organization memberships
 */
import { Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function NoOrganization() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <div className="mx-auto w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                        <Building2 className="w-8 h-8 text-slate-400" />
                    </div>
                    <CardTitle>No Organization Found</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-slate-600 mb-4">
                        You are not a member of any organization yet.
                        Please contact your administrator to receive an invitation.
                    </p>
                    <p className="text-sm text-slate-500">
                        Once you are invited to an organization, you will be able to access the dashboard.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

export default NoOrganization;
