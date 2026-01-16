/**
 * IAM Organization Service
 * API calls for organization endpoints
 */
import { api } from "@/lib/api";
import type {
  Organization,
  OrganizationMember,
  MyMembership,
  CreateOrganizationRequest,
  CreateOrganizationResponse,
  InviteMemberRequest,
  InviteMemberResponse,
} from "@/types";

/**
 * Get all registered organizations (public)
 */
export const getRegisteredOrganizations = async (): Promise<Organization[]> => {
  return api.get<Organization[]>("/iam/organization/registered");
};

/**
 * Get current user's organizations
 */
export const getMyOrganizations = async (): Promise<MyMembership[]> => {
  return api.get<MyMembership[]>("/iam/organization/my");
};

/**
 * Get organization detail by ID
 */
export const getOrganization = async (orgId: string): Promise<Organization> => {
  return api.get<Organization>(`/iam/organization/${orgId}`);
};

/**
 * Get organization members
 */
export const getOrganizationMembers = async (
  orgId: string
): Promise<OrganizationMember[]> => {
  return api.get<OrganizationMember[]>(`/iam/organization/${orgId}/member`);
};

/**
 * Create new organization
 * Only GOV_SUPERVISOR and EXECUTING_AGENCY admins can create organizations
 */
export const createOrganization = async (
  callerOrgId: string,
  data: CreateOrganizationRequest
): Promise<CreateOrganizationResponse> => {
  return api.post<CreateOrganizationResponse>(
    `/iam/organization/${callerOrgId}`,
    data
  );
};

/**
 * Invite new member to organization
 * Only admins can invite members
 */
export const inviteMember = async (
  orgId: string,
  data: InviteMemberRequest
): Promise<InviteMemberResponse> => {
  return api.post<InviteMemberResponse>(
    `/iam/organization/${orgId}/member/invite`,
    data
  );
};

/**
 * Update organization (name and logo)
 * Only admins can update organizations
 */
export interface UpdateOrganizationData {
  name: string;
  logoUrl?: string;
}

export const updateOrganization = async (
  orgId: string,
  data: UpdateOrganizationData
): Promise<Organization> => {
  return api.put<Organization>(`/iam/organization/${orgId}`, data);
};
