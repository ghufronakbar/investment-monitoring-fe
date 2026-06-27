'use client';

import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { invalidateByRealtimeEvent } from '@/constants';
import { getAccessToken } from '@/lib/auth';
import { useAuth } from '@/hooks/use-auth';
import { RealtimeWebSocketClient } from '@/services';
import type {
    DomainEventData,
    RealtimeConnectionStatus,
    RealtimeConnectedData,
    RealtimeEnvelope,
    RealtimeSubscriptionUpdatedData,
} from '@/types';

interface RealtimeContextValue {
    status: RealtimeConnectionStatus;
    topics: string[];
    subscribe: (topics: string[]) => void;
    unsubscribe: (topics: string[]) => void;
}

const RealtimeContext = createContext<RealtimeContextValue | undefined>(undefined);

interface RealtimeProviderProps {
    children: ReactNode;
}

const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const projectIdFromPathname = (pathname: string | null): string | null => {
    if (!pathname) {
        return null;
    }

    const match = pathname.match(/^\/dashboard\/([^/]+)/);
    const projectId = match?.[1];
    return projectId && UUID_PATTERN.test(projectId) ? projectId : null;
};

const projectTopics = (projectId: string): string[] => [
    `project.${projectId}`,
    `project.${projectId}.monitoring`,
    `project.${projectId}.ticket`,
    `project.${projectId}.finance`,
];

const isDomainEnvelope = (
    envelope: RealtimeEnvelope
): envelope is RealtimeEnvelope<DomainEventData> => {
    return !envelope.type.startsWith('realtime.');
};

export function RealtimeProvider({ children }: RealtimeProviderProps) {
    const queryClient = useQueryClient();
    const pathname = usePathname();
    const { user, isAuthenticated, isLoading } = useAuth();

    const clientRef = useRef<RealtimeWebSocketClient | null>(null);
    const topicsRef = useRef<string[]>([]);
    const sentTopicsRef = useRef<Set<string>>(new Set());
    const [status, setStatus] = useState<RealtimeConnectionStatus>('idle');

    const topics = useMemo(() => {
        if (!user?.id) {
            return [];
        }

        const nextTopics = [`user.${user.id}`];
        const projectId = projectIdFromPathname(pathname);
        if (projectId) {
            nextTopics.push(...projectTopics(projectId));
        }

        return nextTopics;
    }, [pathname, user?.id]);

    useEffect(() => {
        topicsRef.current = topics;
    }, [topics]);

    useEffect(() => {
        if (isLoading || !isAuthenticated || !user?.id) {
            clientRef.current?.close();
            clientRef.current = null;
            sentTopicsRef.current = new Set();
            setStatus('idle');
            return;
        }

        const accessToken = getAccessToken();
        if (!accessToken) {
            return;
        }

        const client = new RealtimeWebSocketClient({
            accessToken,
            onStatusChange: setStatus,
            onMessage: (envelope) => {
                if (envelope.type === 'realtime.connected') {
                    sentTopicsRef.current = new Set();
                    const connected = envelope.data as RealtimeConnectedData;
                    if (connected.topics.length > 0) {
                        sentTopicsRef.current = new Set(connected.topics);
                    }
                    client.subscribe(topicsRef.current);
                    topicsRef.current.forEach((topic) => sentTopicsRef.current.add(topic));
                    return;
                }

                if (envelope.type === 'realtime.subscription_updated') {
                    const updated = envelope.data as RealtimeSubscriptionUpdatedData;
                    updated.subscribed.forEach((topic) => sentTopicsRef.current.add(topic));
                    updated.unsubscribed.forEach((topic) => sentTopicsRef.current.delete(topic));
                    if (updated.rejected.length > 0) {
                        console.debug('Rejected realtime topics', updated.rejected);
                    }
                    return;
                }

                if (isDomainEnvelope(envelope)) {
                    invalidateByRealtimeEvent(queryClient, envelope);
                }
            },
        });

        clientRef.current = client;
        client.connect();

        return () => {
            client.close();
            if (clientRef.current === client) {
                clientRef.current = null;
            }
            sentTopicsRef.current = new Set();
        };
    }, [isAuthenticated, isLoading, queryClient, user?.id]);

    useEffect(() => {
        const client = clientRef.current;
        if (!client || status !== 'connected') {
            return;
        }

        const nextTopics = new Set(topics);
        const previousTopics = sentTopicsRef.current;
        const toSubscribe = [...nextTopics].filter((topic) => !previousTopics.has(topic));
        const toUnsubscribe = [...previousTopics].filter((topic) => !nextTopics.has(topic));

        if (toSubscribe.length > 0) {
            client.subscribe(toSubscribe);
            toSubscribe.forEach((topic) => previousTopics.add(topic));
        }

        if (toUnsubscribe.length > 0) {
            client.unsubscribe(toUnsubscribe);
            toUnsubscribe.forEach((topic) => previousTopics.delete(topic));
        }
    }, [status, topics]);

    const value = useMemo<RealtimeContextValue>(() => ({
        status,
        topics,
        subscribe: (nextTopics: string[]) => clientRef.current?.subscribe(nextTopics),
        unsubscribe: (nextTopics: string[]) => clientRef.current?.unsubscribe(nextTopics),
    }), [status, topics]);

    return (
        <RealtimeContext.Provider value={value}>
            {children}
        </RealtimeContext.Provider>
    );
}

export function useRealtime(): RealtimeContextValue {
    const context = useContext(RealtimeContext);
    if (context === undefined) {
        throw new Error('useRealtime must be used within a RealtimeProvider');
    }
    return context;
}

export default RealtimeProvider;
