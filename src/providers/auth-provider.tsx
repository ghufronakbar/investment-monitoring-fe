'use client';

/**
 * Auth Context Provider
 * Global authentication state using React Context + TanStack Query
 */
import {
    createContext,
    useContext,
    useState,
    useCallback,
    useEffect,
    type ReactNode,
} from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { STORAGE_KEYS, queryKeys, invalidationMap } from '@/constants';
import {
    clearTokens,
    getRefreshToken,
    isAuthenticated as checkAuth,
} from '@/lib/auth';
import {
    login as loginApi,
    logout as logoutApi,
    revokeAllRefreshTokens,
} from '@/services';
import type { User, Membership, LoginRequest, LoginResponse } from '@/types';

// Check if we're in browser environment
const isBrowser = typeof window !== 'undefined';

// Auth context value type
interface AuthContextValue {
    user: User | null;
    memberships: Membership[];
    activeMembership: Membership | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    isLoggingIn: boolean;
    login: (data: LoginRequest) => Promise<LoginResponse>;
    logout: () => Promise<void>;
    revokeAllSessions: () => Promise<void>;
    setActiveMembership: (membership: Membership) => void;
}

// Create context
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Provider props
interface AuthProviderProps {
    children: ReactNode;
}

/**
 * Auth Provider Component
 */
export function AuthProvider({ children }: AuthProviderProps) {
    const queryClient = useQueryClient();

    // Local state for auth data
    const [user, setUser] = useState<User | null>(null);
    const [memberships, setMemberships] = useState<Membership[]>([]);
    const [activeMembership, setActiveMembershipState] = useState<Membership | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Load stored auth state on mount
    useEffect(() => {
        if (!isBrowser) return;

        const loadStoredAuth = () => {
            const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
            const storedMemberships = localStorage.getItem(STORAGE_KEYS.MEMBERSHIPS);
            const storedActiveMembership = localStorage.getItem(STORAGE_KEYS.ACTIVE_MEMBERSHIP);

            if (storedUser && checkAuth()) {
                setUser(JSON.parse(storedUser));
                setIsAuthenticated(true);

                if (storedMemberships) {
                    setMemberships(JSON.parse(storedMemberships));
                }

                if (storedActiveMembership) {
                    setActiveMembershipState(JSON.parse(storedActiveMembership));
                }
            }

            setIsLoading(false);
        };

        loadStoredAuth();
    }, []);

    // Login mutation using TanStack Query
    const loginMutation = useMutation({
        mutationFn: loginApi,
        onSuccess: (response) => {
            // Update local state
            setUser(response.user);
            setMemberships(response.memberships);
            setIsAuthenticated(true);

            // Persist to localStorage
            if (isBrowser) {
                localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.user));
                localStorage.setItem(STORAGE_KEYS.MEMBERSHIPS, JSON.stringify(response.memberships));
            }

            // Auto-select first membership
            if (response.memberships.length > 0) {
                setActiveMembershipState(response.memberships[0]);
                if (isBrowser) {
                    localStorage.setItem(
                        STORAGE_KEYS.ACTIVE_MEMBERSHIP,
                        JSON.stringify(response.memberships[0])
                    );
                }
            }

            // Invalidate auth-related queries to refresh data
            invalidationMap.auth.forEach((key) => {
                queryClient.invalidateQueries({ queryKey: key });
            });
        },
    });

    // Login function
    const login = useCallback(
        async (data: LoginRequest): Promise<LoginResponse> => {
            return loginMutation.mutateAsync(data);
        },
        [loginMutation]
    );

    // Logout function
    const clearAuthState = useCallback(() => {
        // Clear local state
        setUser(null);
        setMemberships([]);
        setActiveMembershipState(null);
        setIsAuthenticated(false);

        // Clear localStorage
        if (isBrowser) {
            localStorage.removeItem(STORAGE_KEYS.USER);
            localStorage.removeItem(STORAGE_KEYS.MEMBERSHIPS);
            localStorage.removeItem(STORAGE_KEYS.ACTIVE_MEMBERSHIP);
        }

        // Clear all cached queries
        queryClient.clear();
    }, [queryClient]);

    // Logout function
    const logout = useCallback(async () => {
        try {
            await logoutApi();
        } catch {
            // Local logout must continue even if the backend is unreachable.
        } finally {
            clearAuthState();
        }
    }, [clearAuthState]);

    const revokeAllSessions = useCallback(async () => {
        const refreshToken = getRefreshToken();

        try {
            if (refreshToken) {
                await revokeAllRefreshTokens(refreshToken);
            }
        } catch {
            // Clear this browser session even when revoke-all cannot reach the API.
        } finally {
            clearTokens();
            clearAuthState();
        }
    }, [clearAuthState]);

    // Set active membership
    const setActiveMembership = useCallback((membership: Membership) => {
        setActiveMembershipState(membership);
        if (isBrowser) {
            localStorage.setItem(STORAGE_KEYS.ACTIVE_MEMBERSHIP, JSON.stringify(membership));
        }

        // Invalidate queries that might depend on the active membership
        // Projects, tasks, etc. might be filtered by current org
        queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    }, [queryClient]);

    // Context value
    const value: AuthContextValue = {
        user,
        memberships,
        activeMembership,
        isAuthenticated,
        isLoading,
        isLoggingIn: loginMutation.isPending,
        login,
        logout,
        revokeAllSessions,
        setActiveMembership,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * useAuth Hook
 * Access auth context from any component
 */
export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export default AuthProvider;
