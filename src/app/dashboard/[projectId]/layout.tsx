'use client';

import { ProjectProvider, useProject } from '@/providers';
import { ProjectSidebar, DashboardNavbar } from '@/components/dashboard';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

function ProjectContent({ children }: { children: React.ReactNode }) {
    const { isLoading, error, project } = useProject();

    // Loading project
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Spinner className="w-8 h-8" />
            </div>
        );
    }

    // Error loading project
    if (error || !project) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                            <AlertTriangle className="w-6 h-6 text-red-600" />
                        </div>
                        <CardTitle>Project Not Found</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-slate-600 mb-4">
                            The project you are looking for does not exist or you do not have access to it.
                        </p>
                        <Link href="/dashboard">
                            <Button>Back to Projects</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Project loaded - show dashboard with sidebar
    return (
        <div className="h-screen flex overflow-hidden bg-slate-50">
            {/* Project Sidebar */}
            <ProjectSidebar />

            {/* Main content area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <main className="flex-1 p-6 overflow-auto">{children}</main>
            </div>
        </div>
    );
}

export default function ProjectLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ProjectProvider>
            <ProjectContent>{children}</ProjectContent>
        </ProjectProvider>
    );
}
