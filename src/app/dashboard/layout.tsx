'use client';

import { useAuth } from '@/hooks/use-auth';
import { OrganizationProvider, useOrganization } from '@/providers';
import { AuthGuard } from '@/components/auth';
import { DashboardNavbar } from '@/components/dashboard';
import { NoOrganization } from '@/components/dashboard/no-organization';
import { Spinner } from '@/components/ui/spinner';

function DashboardContent({ children }: { children: React.ReactNode }) {
    const { isLoading } = useAuth();
    const { hasOrganization } = useOrganization();

    // Still loading memberships
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Spinner className="w-8 h-8" />
            </div>
        );
    }

    // No organization memberships
    if (!hasOrganization) {
        return <NoOrganization />;
    }

    // Dashboard without sidebar - for project selection
    return (
        <div className="h-screen flex flex-col overflow-hidden bg-slate-50">
            <DashboardNavbar />
            <main className="flex-1 overflow-auto">{children}</main>
        </div>
    );
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AuthGuard>
            <OrganizationProvider>
                <DashboardContent>{children}</DashboardContent>
            </OrganizationProvider>
        </AuthGuard>
    );
}
