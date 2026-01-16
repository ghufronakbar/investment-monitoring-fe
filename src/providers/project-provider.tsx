'use client';

/**
 * Project Context Provider
 * Manages active project selection within the dashboard
 */
import {
    createContext,
    useContext,
    useState,
    useCallback,
    useEffect,
    type ReactNode,
} from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/constants';
import { getProjectDetail } from '@/services';
import type { ProjectDetail } from '@/types';

interface ProjectContextValue {
    projectId: string | null;
    project: ProjectDetail | null;
    isLoading: boolean;
    error: Error | null;
    navigateToProject: (projectId: string) => void;
}

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined);

interface ProjectProviderProps {
    children: ReactNode;
}

export function ProjectProvider({ children }: ProjectProviderProps) {
    const params = useParams();
    const router = useRouter();

    const projectId = params?.projectId as string | undefined;

    // Fetch project detail when projectId is available
    const { data, isLoading, error } = useQuery({
        queryKey: queryKeys.projects.detail(projectId ?? ''),
        queryFn: () => getProjectDetail(projectId!),
        enabled: !!projectId,
    });

    const navigateToProject = useCallback((id: string) => {
        router.push(`/dashboard/${id}/overview`);
    }, [router]);

    const value: ProjectContextValue = {
        projectId: projectId ?? null,
        project: data ?? null,
        isLoading,
        error: error as Error | null,
        navigateToProject,
    };

    return (
        <ProjectContext.Provider value={value}>
            {children}
        </ProjectContext.Provider>
    );
}

export function useProject(): ProjectContextValue {
    const context = useContext(ProjectContext);
    if (context === undefined) {
        throw new Error('useProject must be used within a ProjectProvider');
    }
    return context;
}

export default ProjectProvider;
