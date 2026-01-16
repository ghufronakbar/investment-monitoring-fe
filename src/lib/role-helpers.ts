/**
 * Role Display Helpers
 * Convert role codes to readable names
 */

// Organization Role readable names
export function getOrgRoleDisplayName(role: string | null): string {
  if (!role) return "Unknown";

  const roleNames: Record<string, string> = {
    GOV_SUPERVISOR: "Government Supervisor",
    EXECUTING_AGENCY: "Executing Agency",
    CONTRACTOR: "Contractor",
    INDEPENDENT_AUDITOR: "Independent Auditor",
    LOAN_PROVIDER: "Loan Provider",
    GOV_PARTNER: "Government Partner",
  };

  return roleNames[role] || role;
}

// Member Role readable names
export function getMemberRoleDisplayName(role: string | null): string {
  if (!role) return "Unknown";

  const roleNames: Record<string, string> = {
    ADMIN: "Administrator",
    MEMBER: "Member",
  };

  return roleNames[role] || role;
}

// Get role badge variant based on org role
export function getOrgRoleBadgeVariant(
  role: string | null
): "default" | "secondary" | "outline" | "destructive" {
  if (!role) return "secondary";

  const variants: Record<
    string,
    "default" | "secondary" | "outline" | "destructive"
  > = {
    GOV_SUPERVISOR: "default",
    EXECUTING_AGENCY: "default",
    LOAN_PROVIDER: "default",
    CONTRACTOR: "secondary",
    INDEPENDENT_AUDITOR: "secondary",
    GOV_PARTNER: "outline",
  };

  return variants[role] || "secondary";
}
