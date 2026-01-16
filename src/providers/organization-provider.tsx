'use client';

/**
 * Organization Context Provider
 * Manages active organization selection for multi-org users
 */
import {
    createContext,
    useContext,
    useState,
    useCallback,
    useEffect,
    type ReactNode,
} from 'react';
import { useAuth } from '@/hooks/use-auth';
import { STORAGE_KEYS } from '@/constants';
import type { Membership } from '@/types';

const ACTIVE_ORG_KEY = STORAGE_KEYS.ACTIVE_MEMBERSHIP;
const isBrowser = typeof window !== 'undefined';

interface OrganizationContextValue {
    activeOrganization: Membership | null;
    organizations: Membership[];
    hasOrganization: boolean;
    setActiveOrganization: (org: Membership) => void;
    // Convenience getters
    orgId: string | null;
    orgName: string | null;
    orgRole: string | null;
    memberRole: string | null;
    isAdmin: boolean;
}

const OrganizationContext = createContext<OrganizationContextValue | undefined>(undefined);

interface OrganizationProviderProps {
    children: ReactNode;
}

export function OrganizationProvider({ children }: OrganizationProviderProps) {
    const { memberships, isLoading } = useAuth();
    const [activeOrg, setActiveOrg] = useState<Membership | null>(null);

    // Initialize from localStorage or first membership
    useEffect(() => {
        if (isLoading) return;

        // Try to load from localStorage
        if (isBrowser) {
            const stored = localStorage.getItem(ACTIVE_ORG_KEY);
            if (stored) {
                try {
                    const parsed = JSON.parse(stored) as Membership;
                    // Verify it's still in memberships
                    const exists = memberships.find((m) => m.id === parsed.id);
                    if (exists) {
                        setActiveOrg(exists);
                        return;
                    }
                } catch {
                    // Ignore parse errors
                }
            }
        }

        // Default to first membership
        if (memberships.length > 0) {
            setActiveOrg(memberships[0]);
            if (isBrowser) {
                localStorage.setItem(ACTIVE_ORG_KEY, JSON.stringify(memberships[0]));
            }
        }
    }, [memberships, isLoading]);

    const setActiveOrganization = useCallback((org: Membership) => {
        setActiveOrg(org);
        if (isBrowser) {
            localStorage.setItem(ACTIVE_ORG_KEY, JSON.stringify(org));
        }
    }, []);

    const value: OrganizationContextValue = {
        activeOrganization: activeOrg,
        organizations: memberships,
        hasOrganization: memberships.length > 0,
        setActiveOrganization,
        // Convenience getters
        orgId: activeOrg?.orgId ?? null,
        orgName: activeOrg?.orgName ?? null,
        orgRole: activeOrg?.orgRole ?? null,
        memberRole: activeOrg?.memberRole ?? null,
        isAdmin: activeOrg?.memberRole === 'ADMIN',
    };

    return (
        <OrganizationContext.Provider value={value}>
            {children}
        </OrganizationContext.Provider>
    );
}

export function useOrganization(): OrganizationContextValue {
    const context = useContext(OrganizationContext);
    if (context === undefined) {
        throw new Error('useOrganization must be used within an OrganizationProvider');
    }
    return context;
}

export default OrganizationProvider;
