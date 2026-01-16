'use client';

/**
 * Organization Select Component
 * Dropdown select with avatar and org info for assignment pages
 */
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { getOrgRoleDisplayName } from '@/lib/role-helpers';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Building2, Check, ChevronsUpDown } from 'lucide-react';
import type { Organization } from '@/types';

export interface OrganizationSelectProps {
    organizations: Organization[];
    value?: string;
    onChange?: (value: string) => void;
    label?: string;
    placeholder?: string;
    disabled?: boolean;
    filterRole?: string;
    className?: string;
}

export function OrganizationSelect({
    organizations,
    value,
    onChange,
    label,
    placeholder = 'Select organization...',
    disabled,
    filterRole,
    className,
}: OrganizationSelectProps) {
    const [open, setOpen] = useState(false);

    // Filter by role if specified
    const filteredOrgs = filterRole
        ? organizations.filter((org) => org.role === filterRole)
        : organizations;

    const selectedOrg = filteredOrgs.find((org) => org.id === value);

    const handleSelect = (orgId: string) => {
        onChange?.(orgId);
        setOpen(false);
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((word) => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <div className={cn('space-y-2', className)}>
            {label && <Label>{label}</Label>}

            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        disabled={disabled}
                        className="w-full justify-between h-auto min-h-[44px] px-3 py-2"
                    >
                        {selectedOrg ? (
                            <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={selectedOrg.logoUrl || undefined} alt={selectedOrg.name} />
                                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                                        {getInitials(selectedOrg.name)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="text-left">
                                    <p className="font-medium text-sm">{selectedOrg.name}</p>
                                    <p className="text-xs text-slate-500">{getOrgRoleDisplayName(selectedOrg.role)}</p>
                                </div>
                            </div>
                        ) : (
                            <span className="text-slate-500">{placeholder}</span>
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    {filteredOrgs.length === 0 ? (
                        <div className="p-4 text-center text-slate-500">
                            <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                            <p className="text-sm">No organizations available</p>
                        </div>
                    ) : (
                        <div className="max-h-[300px] overflow-y-auto">
                            {filteredOrgs.map((org) => {
                                const isSelected = org.id === value;

                                return (
                                    <button
                                        key={org.id}
                                        type="button"
                                        onClick={() => handleSelect(org.id)}
                                        className={cn(
                                            'w-full flex items-center gap-3 p-3 text-left transition-colors',
                                            'hover:bg-slate-100',
                                            isSelected && 'bg-primary/5'
                                        )}
                                    >
                                        {/* Avatar */}
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage src={org.logoUrl || undefined} alt={org.name} />
                                            <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                                                {getInitials(org.name)}
                                            </AvatarFallback>
                                        </Avatar>

                                        {/* Org Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-slate-900 truncate">{org.name}</p>
                                            <p className="text-xs text-slate-500">{getOrgRoleDisplayName(org.role)}</p>
                                        </div>

                                        {/* Selected indicator */}
                                        {isSelected && (
                                            <Check className="w-5 h-5 text-primary shrink-0" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </PopoverContent>
            </Popover>
        </div>
    );
}

export default OrganizationSelect;
