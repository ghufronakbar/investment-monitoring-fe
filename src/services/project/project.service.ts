/**
 * Project Service
 * API calls for project management endpoints
 */
import { api } from "@/lib/api";
import type {
  Project,
  ProjectDetail,
  CreateProjectRequest,
  CreateProjectResponse,
  ConfigureSettingsRequest,
  AssignExecutingAgencyRequest,
  AssignVendorRequest,
  AssignAuditorRequest,
  AssignGovPartnersRequest,
  SuccessResponse,
} from "@/types";

/**
 * Create new project
 * Only GOV_SUPERVISOR ADMIN can create projects
 */
export const createProject = async (
  data: CreateProjectRequest
): Promise<CreateProjectResponse> => {
  return api.post<CreateProjectResponse>("/project", data);
};

/**
 * List all accessible projects
 */
export const getProjects = async (): Promise<Project[]> => {
  return api.get<Project[]>("/project");
};

/**
 * Get project detail with contract and settings
 */
export const getProjectDetail = async (
  projectId: string
): Promise<ProjectDetail> => {
  return api.get<ProjectDetail>(`/project/${projectId}`);
};

/**
 * Configure project settings
 * Only EXECUTING_AGENCY ADMIN can configure
 */
export const configureSettings = async (
  projectId: string,
  data: ConfigureSettingsRequest
): Promise<SuccessResponse> => {
  return api.put<SuccessResponse>(`/project/${projectId}/settings`, data);
};

/**
 * Assign executing agency to project
 * Only GOV_SUPERVISOR ADMIN can assign
 */
export const assignExecutingAgency = async (
  projectId: string,
  data: AssignExecutingAgencyRequest
): Promise<SuccessResponse> => {
  return api.put<SuccessResponse>(
    `/project/${projectId}/contract/assign-executing-agency`,
    data
  );
};

/**
 * Assign vendor (contractor) to project
 * Only EXECUTING_AGENCY ADMIN can assign
 */
export const assignVendor = async (
  projectId: string,
  data: AssignVendorRequest
): Promise<SuccessResponse> => {
  return api.put<SuccessResponse>(
    `/project/${projectId}/contract/assign-vendor`,
    data
  );
};

/**
 * Assign auditor to project
 * Only EXECUTING_AGENCY ADMIN can assign
 */
export const assignAuditor = async (
  projectId: string,
  data: AssignAuditorRequest
): Promise<SuccessResponse> => {
  return api.put<SuccessResponse>(
    `/project/${projectId}/contract/assign-auditor`,
    data
  );
};

/**
 * Assign government partners to project
 * Only EXECUTING_AGENCY ADMIN can assign
 */
export const assignGovPartners = async (
  projectId: string,
  data: AssignGovPartnersRequest
): Promise<SuccessResponse> => {
  return api.put<SuccessResponse>(
    `/project/${projectId}/contract/assign-gov-partners`,
    data
  );
};
