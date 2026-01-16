'use client';

/**
 * Dashboard Navbar
 * Organization selector, navigation, and user menu
 */
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { useOrganization } from '@/providers';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, LogOut, User, Building2, Check, FolderKanban, Plus } from 'lucide-react';
import { getMemberRoleDisplayName, getOrgRoleDisplayName } from '@/lib/role-helpers';

export function DashboardNavbar() {
    const router = useRouter();
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const { activeOrganization, organizations, setActiveOrganization, orgRole, isAdmin } = useOrganization();

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    // Check if current path matches nav item
    const isActiveNav = (href: string) => {
        if (href === '/dashboard') {
            return pathname === '/dashboard' || pathname.startsWith('/dashboard/projects');
        }
        return pathname.startsWith(href);
    };

    // Can create organization (GOV_SUPERVISOR or EXECUTING_AGENCY admin)
    const canCreateOrg = (orgRole === 'GOV_SUPERVISOR' || orgRole === 'EXECUTING_AGENCY') && isAdmin;

    return (
        <header className="h-14 border-b bg-white flex items-center justify-between px-4">
            {/* Left side - Organization Selector + Navigation */}
            <div className="flex items-center gap-6">
                {/* Organization Selector */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            <span className="max-w-[200px] truncate">
                                {activeOrganization?.orgName || 'Select Organization'}
                            </span>
                            {activeOrganization && (
                                <Badge variant="secondary" className="text-xs">
                                    {getOrgRoleDisplayName(activeOrganization.orgRole)}
                                </Badge>
                            )}
                            <ChevronDown className="w-4 h-4 ml-1" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-72">
                        <DropdownMenuLabel>Your Organizations</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {organizations.map((org) => (
                            <DropdownMenuItem
                                key={org.id}
                                onClick={() => setActiveOrganization(org)}
                                className="flex items-center justify-between cursor-pointer"
                            >
                                <div className="flex flex-col">
                                    <span className="font-medium">{org.orgName}</span>
                                    <span className="text-xs text-slate-500">
                                        {getOrgRoleDisplayName(org.orgRole)} • {getMemberRoleDisplayName(org.memberRole)}
                                    </span>
                                </div>
                                {activeOrganization?.id === org.id && (
                                    <Check className="w-4 h-4 text-primary" />
                                )}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Navigation Links */}
                <nav className="flex items-center gap-1">
                    <Link href="/dashboard">
                        <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                                'gap-2',
                                isActiveNav('/dashboard') && 'bg-primary/10 text-primary'
                            )}
                        >
                            <FolderKanban className="w-4 h-4" />
                            Projects
                        </Button>
                    </Link>
                    <Link href="/dashboard/organization">
                        <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                                'gap-2',
                                isActiveNav('/dashboard/organization') && 'bg-primary/10 text-primary'
                            )}
                        >
                            <Building2 className="w-4 h-4" />
                            Organization
                        </Button>
                    </Link>
                    {canCreateOrg && (
                        <Link href="/dashboard/organization/create">
                            <Button
                                variant="ghost"
                                size="sm"
                                className={cn(
                                    'gap-2',
                                    isActiveNav('/dashboard/organization/create') && 'bg-primary/10 text-primary'
                                )}
                            >
                                <Plus className="w-4 h-4" />
                                Create Org
                            </Button>
                        </Link>
                    )}
                </nav>
            </div>

            {/* Right side - User Menu */}
            <div className="flex items-center gap-4">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                                <User className="w-4 h-4 text-slate-600" />
                            </div>
                            <span className="max-w-[150px] truncate text-sm">
                                {user?.name || user?.email}
                            </span>
                            <ChevronDown className="w-4 h-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>
                            <div className="flex flex-col">
                                <span>{user?.name || 'User'}</span>
                                <span className="text-xs font-normal text-slate-500">{user?.email}</span>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <Link href="/dashboard/profile">
                            <DropdownMenuItem className="cursor-pointer">
                                <User className="w-4 h-4 mr-2" />
                                Profile
                            </DropdownMenuItem>
                        </Link>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
                            <LogOut className="w-4 h-4 mr-2" />
                            Logout
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}

export default DashboardNavbar;

