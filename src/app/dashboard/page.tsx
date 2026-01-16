'use client';

/**
 * Dashboard Home - Project Selection Page
 */
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { queryKeys } from '@/constants';
import { getProjects } from '@/services';
import { useOrganization } from '@/providers';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { FolderKanban, Plus, Calendar, ArrowRight } from 'lucide-react';

export default function DashboardPage() {
    const router = useRouter();
    const { orgRole, isAdmin } = useOrganization();

    // Check if user can create projects (GOV_SUPERVISOR ADMIN only)
    const canCreateProject = orgRole === 'GOV_SUPERVISOR' && isAdmin;

    // Fetch projects
    const { data: projects, isLoading, error } = useQuery({
        queryKey: queryKeys.projects.list(),
        queryFn: getProjects,
    });

    const handleSelectProject = (projectId: string) => {
        router.push(`/dashboard/${projectId}/overview`);
    };

    const handleCreateProject = () => {
        router.push('/dashboard/projects/create');
    };

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center p-8">
                <Spinner className="w-8 h-8" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex-1 flex items-center justify-center p-8">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <CardTitle className="text-red-600">Error</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-slate-600">Failed to load projects. Please try again.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-8">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
                    <p className="text-slate-600">Select a project to view its dashboard</p>
                </div>
                {canCreateProject && (
                    <Button onClick={handleCreateProject}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create New Project
                    </Button>
                )}
            </div>

            {/* Projects Grid */}
            {(!projects || projects.length === 0) ? (
                <Card className="text-center py-12">
                    <CardContent>
                        <FolderKanban className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-slate-700 mb-2">No Projects Found</h3>
                        <p className="text-slate-500 mb-4">
                            {canCreateProject
                                ? 'Get started by creating your first project.'
                                : 'You are not assigned to any projects yet.'}
                        </p>
                        {canCreateProject && (
                            <Button onClick={handleCreateProject}>
                                <Plus className="w-4 h-4 mr-2" />
                                Create New Project
                            </Button>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map((project) => (
                        <Card
                            key={project.id}
                            className="cursor-pointer hover:shadow-lg transition-shadow group"
                            onClick={() => handleSelectProject(project.id)}
                        >
                            {/* Project Image */}
                            {project.imageUrls && project.imageUrls.length > 0 && (
                                <div className="h-40 overflow-hidden rounded-t-lg">
                                    <img
                                        src={project.imageUrls[0]}
                                        alt={project.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                    />
                                </div>
                            )}
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <span className="truncate">{project.name}</span>
                                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-primary transition-colors" />
                                </CardTitle>
                                <CardDescription className="line-clamp-2">
                                    {project.description}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center text-sm text-slate-500">
                                    <Calendar className="w-4 h-4 mr-1" />
                                    Created {new Date(project.createdAt).toLocaleDateString()}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
