/**
 * User and membership types
 */
import type { OrganizationRole } from "./organization";

// Member role enum
export type MemberRole = "ADMIN" | "MEMBER";

// User data
export interface User {
  id: string;
  name: string;
  email: string;
  imageUrl: string | null;
}

// Organization membership
export interface Membership {
  id: string;
  memberRole: MemberRole;
  orgId: string;
  orgName: string;
  orgRole: OrganizationRole;
  orgLogoUrl: string | null;
  createdAt: string;
}

// Extended membership with joinedAt (from /my endpoint)
export interface MyMembership {
  membershipId: string;
  memberRole: MemberRole;
  orgId: string;
  orgName: string;
  orgRole: OrganizationRole;
  orgLogoUrl: string | null;
  joinedAt: string;
}
