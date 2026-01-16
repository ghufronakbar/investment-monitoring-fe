'use client';

/**
 * Project-Specific Sidebar
 * Navigation within a project context with section labels
 */
import { useState, useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { getOrgRoleDisplayName, getMemberRoleDisplayName } from '@/lib/role-helpers';
import { useOrganization, useProject } from '@/providers';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    LayoutDashboard,
    FolderKanban,
    Building2,
    ListTodo,
    ClipboardCheck,
    Ticket,
    CreditCard,
    FileCheck,
    Banknote,
    Settings,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    ArrowLeft,
    TrendingUp,
    AlertCircle,
    Users,
} from 'lucide-react';

interface MenuItem {
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    children?: MenuItem[];
}

interface MenuSection {
    label?: string; // Section label (optional, if undefined = no label)
    items: MenuItem[];
}

// Menu sections based on organization role
function getProjectMenuSections(projectId: string, orgRole: string | null, isAdmin: boolean): MenuSection[] {
    const baseHref = `/dashboard/${projectId}`;

    // Common project items for all roles
    const projectSection: MenuSection = {
        label: 'Project',
        items: [
            { label: 'Overview', href: `${baseHref}/overview`, icon: LayoutDashboard },
            { label: 'Details', href: `${baseHref}/details`, icon: FolderKanban },
        ],
    };

    switch (orgRole) {
        case 'GOV_SUPERVISOR':
            return [
                projectSection,
                {
                    label: 'Monitoring',
                    items: [
                        { label: 'Tasks (WBS)', href: `${baseHref}/monitoring/tasks`, icon: ListTodo },
                        { label: 'S-Curve', href: `${baseHref}/monitoring/s-curve`, icon: TrendingUp },
                    ],
                },
                {
                    label: 'Issue & Payment',
                    items: [
                        { label: 'Tickets', href: `${baseHref}/tickets`, icon: Ticket },
                        { label: 'Payment Requests', href: `${baseHref}/finance/requests`, icon: CreditCard },
                    ],
                },
                ...(isAdmin ? [{
                    label: 'Administration',
                    items: [
                        { label: 'Settings', href: `${baseHref}/settings`, icon: Settings },
                    ],
                }] : []),
            ];

        case 'EXECUTING_AGENCY':
            return [
                projectSection,
                {
                    label: 'Monitoring',
                    items: [
                        { label: 'Tasks (WBS)', href: `${baseHref}/monitoring/tasks`, icon: ListTodo },
                        { label: 'S-Curve', href: `${baseHref}/monitoring/s-curve`, icon: TrendingUp },
                        { label: 'Pending Validations', href: `${baseHref}/validations`, icon: FileCheck },
                    ],
                },
                {
                    label: 'Issue & Payment',
                    items: [
                        { label: 'Tickets', href: `${baseHref}/tickets`, icon: Ticket },
                        { label: 'Payment Requests', href: `${baseHref}/finance/requests`, icon: CreditCard },
                    ],
                },
                ...(isAdmin ? [{
                    label: 'Administration',
                    items: [
                        { label: 'Settings', href: `${baseHref}/settings`, icon: Settings },
                    ],
                }] : []),
            ];

        case 'CONTRACTOR':
            return [
                projectSection,
                {
                    label: 'My Work',
                    items: [
                        { label: 'My Tasks', href: `${baseHref}/tasks`, icon: ListTodo },
                        { label: 'Submit Progress', href: `${baseHref}/submit-progress`, icon: ClipboardCheck },
                    ],
                },
                {
                    label: 'Request & Report',
                    items: [
                        { label: 'Report Issue', href: `${baseHref}/tickets/create`, icon: AlertCircle },
                        { label: 'Request Payment', href: `${baseHref}/finance/request`, icon: CreditCard },
                        { label: 'My Requests', href: `${baseHref}/finance/requests`, icon: Banknote },
                    ],
                },
            ];

        case 'INDEPENDENT_AUDITOR':
            return [
                projectSection,
                {
                    label: 'Verification',
                    items: [
                        { label: 'Validate Progress', href: `${baseHref}/validations`, icon: FileCheck },
                        { label: 'Payment Requests', href: `${baseHref}/finance/requests`, icon: Banknote },
                    ],
                },
            ];

        case 'LOAN_PROVIDER':
            return [
                projectSection,
                {
                    label: 'Finance',
                    items: [
                        { label: 'Payment Requests', href: `${baseHref}/finance/requests`, icon: CreditCard },
                    ],
                },
            ];

        case 'GOV_PARTNER':
            return [
                projectSection,
                {
                    label: 'Tickets',
                    items: [
                        { label: 'Assigned Tickets', href: `${baseHref}/tickets`, icon: Ticket },
                    ],
                },
            ];

        default:
            return [projectSection];
    }
}

const SIDEBAR_COLLAPSED_KEY = 'jica_sidebar_collapsed';
const isBrowser = typeof window !== 'undefined';

export function ProjectSidebar() {
    const pathname = usePathname();
    const { orgRole, memberRole, isAdmin } = useOrganization();
    const { projectId, project } = useProject();

    const menuSections = useMemo(
        () => getProjectMenuSections(projectId ?? '', orgRole, isAdmin),
        [projectId, orgRole, isAdmin]
    );

    const [isCollapsed, setIsCollapsed] = useState(false);
    const [openSubmenus, setOpenSubmenus] = useState<string[]>([]);

    // Load collapsed state from localStorage
    useEffect(() => {
        if (isBrowser) {
            const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
            if (stored === 'true') {
                setIsCollapsed(true);
            }
        }
    }, []);

    // Auto-expand submenus based on current path
    useEffect(() => {
        const shouldOpen: string[] = [];
        menuSections.forEach((section) => {
            section.items.forEach((item) => {
                if (item.children) {
                    const isChildActive = item.children.some((child) =>
                        pathname.startsWith(child.href)
                    );
                    if (isChildActive) {
                        shouldOpen.push(item.href);
                    }
                }
            });
        });
        setOpenSubmenus((prev) => {
            if (JSON.stringify(prev) === JSON.stringify(shouldOpen)) {
                return prev;
            }
            return shouldOpen;
        });
    }, [pathname, projectId, orgRole, isAdmin, menuSections]);

    const toggleCollapse = () => {
        const newValue = !isCollapsed;
        setIsCollapsed(newValue);
        if (isBrowser) {
            localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(newValue));
        }
    };

    const toggleSubmenu = (href: string) => {
        setOpenSubmenus((prev) =>
            prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href]
        );
    };

    const renderMenuItem = (item: MenuItem, depth = 0) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
        const hasChildren = item.children && item.children.length > 0;
        const isOpen = openSubmenus.includes(item.href);
        const Icon = item.icon;

        if (hasChildren && !isCollapsed) {
            return (
                <Collapsible
                    key={item.href}
                    open={isOpen}
                    onOpenChange={() => toggleSubmenu(item.href)}
                >
                    <CollapsibleTrigger asChild>
                        <button
                            className={cn(
                                'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                                isActive
                                    ? 'bg-primary/10 text-primary'
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            )}
                        >
                            <span className="flex items-center gap-3">
                                <Icon className="w-4 h-4 flex-shrink-0" />
                                {item.label}
                            </span>
                            <ChevronDown
                                className={cn(
                                    'w-4 h-4 transition-transform',
                                    isOpen && 'rotate-180'
                                )}
                            />
                        </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pl-4 mt-1 space-y-1">
                        {item.children!.map((child) => renderMenuItem(child, depth + 1))}
                    </CollapsibleContent>
                </Collapsible>
            );
        }

        const linkContent = (
            <Link
                href={item.href}
                className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                    isCollapsed && 'justify-center px-2',
                    depth > 0 && 'text-sm'
                )}
            >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {!isCollapsed && <span>{item.label}</span>}
            </Link>
        );

        if (isCollapsed) {
            return (
                <Tooltip key={item.href}>
                    <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
            );
        }

        return <div key={item.href}>{linkContent}</div>;
    };

    const renderSection = (section: MenuSection, index: number) => {
        return (
            <div key={index} className="space-y-1">
                {/* Section Label */}
                {section.label && !isCollapsed && (
                    <p className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        {section.label}
                    </p>
                )}
                {/* Section Items */}
                {section.items.map((item) => renderMenuItem(item))}
            </div>
        );
    };

    return (
        <TooltipProvider delayDuration={0}>
            <aside
                className={cn(
                    'h-screen flex flex-col border-r bg-white transition-all duration-300',
                    isCollapsed ? 'w-16' : 'w-64'
                )}
            >
                {/* Header with project name */}
                <div
                    className={cn(
                        'flex items-center border-b h-14 px-4',
                        isCollapsed ? 'justify-center' : 'justify-between'
                    )}
                >
                    {!isCollapsed && (
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-500">Project</p>
                            <h1 className="text-sm font-bold text-slate-800 truncate">
                                {project?.project.name || 'Loading...'}
                            </h1>
                        </div>
                    )}
                    <Button variant="ghost" size="icon" onClick={toggleCollapse} className="h-8 w-8 flex-shrink-0">
                        {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                    </Button>
                </div>

                {/* Back to Projects (when not collapsed) */}
                {!isCollapsed && (
                    <div className="px-3 py-2 border-b">
                        <Link
                            href="/dashboard"
                            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Projects
                        </Link>
                    </div>
                )}

                {/* Navigation - Scrollable */}
                <nav className="flex-1 overflow-y-auto p-3 space-y-4">
                    {menuSections.map((section, idx) => renderSection(section, idx))}
                </nav>

                {/* Role indicator - Fixed at bottom */}
                <div className={cn('border-t bg-slate-50 p-3', isCollapsed && 'px-2')}>
                    {isCollapsed ? (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="flex justify-center">
                                    <Building2 className="w-4 h-4 text-slate-500" />
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-[200px]">
                                <p className="font-medium">{getOrgRoleDisplayName(orgRole)}</p>
                                <p className="text-xs text-slate-400">{getMemberRoleDisplayName(memberRole)}</p>
                            </TooltipContent>
                        </Tooltip>
                    ) : (
                        <>
                            <p className="text-xs text-slate-500">Organization Role</p>
                            <p className="text-sm font-medium text-slate-700">{getOrgRoleDisplayName(orgRole)}</p>
                            <p className="text-xs text-slate-500 mt-1">Your Role: {getMemberRoleDisplayName(memberRole)}</p>
                        </>
                    )}
                </div>
            </aside>
        </TooltipProvider>
    );
}

export default ProjectSidebar;
