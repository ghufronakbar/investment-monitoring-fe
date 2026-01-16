/**
 * Organization types
 */
import type { MemberRole } from "./user";

// Organization role enum
export type OrganizationRole =
  | "GOV_SUPERVISOR"
  | "EXECUTING_AGENCY"
  | "CONTRACTOR"
  | "INDEPENDENT_AUDITOR"
  | "LOAN_PROVIDER"
  | "GOV_PARTNER";

// Organization data
export interface Organization {
  id: string;
  name: string;
  role: OrganizationRole;
  logoUrl: string | null;
  createdAt: string;
}

// Organization member with user info
export interface OrganizationMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  imageUrl: string | null;
  memberRole: MemberRole;
  createdAt: string;
}

// Create organization request
export interface CreateOrganizationRequest {
  name: string;
  role: OrganizationRole;
  logoUrl?: string;
  adminName: string;
  adminEmail: string;
}

// Create organization response
export interface CreateOrganizationResponse {
  organization: Organization;
  admin: {
    id: string;
    name: string;
    email: string;
    imageUrl: string | null;
  };
}

// Invite member request
export interface InviteMemberRequest {
  name: string;
  email: string;
}

// Invite member response
export interface InviteMemberResponse {
  member: {
    id: string;
    name: string;
    email: string;
    memberRole: MemberRole;
    createdAt: string;
  };
}
