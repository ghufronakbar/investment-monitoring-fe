/**
 * Project & Contract types
 */

// Contract participant info
export interface ContractParticipant {
  orgId: string;
  orgName: string;
  orgRole: string;
  logoUrl: string | null;
}

// Project data
export interface Project {
  id: string;
  name: string;
  description: string;
  contractFileUrl: string;
  imageUrls: string[];
  createdAt: string;
}

// Project settings
export interface ProjectSettings {
  id: string;
  startDate: string;
  baselineDeadline: string;
  totalBudget: number;
  currency: string;
}

// Contract data
export interface Contract {
  id: string;
  description: string;
  contractValue: number | null;
  contractDocUrl: string | null;
  govSupervisor: ContractParticipant | null;
  loanProvider: ContractParticipant | null;
  executingAgency: ContractParticipant | null;
  vendor: ContractParticipant | null;
  vendorSelectedAt: string | null;
  auditor: ContractParticipant | null;
  auditorSelectedAt: string | null;
  govPartners: ContractParticipant[];
}

// Project detail response
export interface ProjectDetail {
  project: Project;
  contract: Contract;
  settings: ProjectSettings | null;
}

// Create project request
export interface CreateProjectRequest {
  name: string;
  description: string;
  contractFileUrl: string;
  loanProviderId: string;
  imageUrls: string[];
}

// Create project response
export interface CreateProjectResponse {
  project: Project;
  contract: Contract;
}

// Configure settings request
export interface ConfigureSettingsRequest {
  startDate: string;
  baselineDeadline: string;
  totalBudget: number;
  currency: string;
}

// Assign executing agency request
export interface AssignExecutingAgencyRequest {
  executingAgencyId: string;
}

// Assign vendor request
export interface AssignVendorRequest {
  vendorOrgId: string;
  contractValue: number;
  contractDocUrl: string;
}

// Assign auditor request
export interface AssignAuditorRequest {
  auditorOrgId: string;
}

// Assign gov partners request
export interface AssignGovPartnersRequest {
  govPartnerIds: string[];
}

// Generic success response
export interface SuccessResponse {
  success: boolean;
  message: string;
}
