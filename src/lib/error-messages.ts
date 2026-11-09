export const AUTH_ERROR_MESSAGES: Record<string, string> = {
  RATE_LIMIT_EXCEEDED: "Too many attempts. Please try again later.",
  INVALID_CREDENTIALS: "Invalid email or password.",
  USER_NOT_FOUND: "User was not found.",
  PASSWORD_NOT_SET: "Password has not been set for this account.",
  PASSWORD_ALREADY_SET: "Password has already been set.",
  INVALID_REFRESH_TOKEN: "Your session is no longer valid. Please log in again.",
  INVALID_REFRESH_TOKEN_CLAIMS:
    "Your session is no longer valid. Please log in again.",
  REFRESH_TOKEN_REVOKED:
    "Your session was revoked. Please log in again.",
  AUTHENTICATION_REQUIRED: "Please log in to continue.",
};

export const POLICY_ERROR_MESSAGES: Record<string, string> = {
  FORBIDDEN: "You do not have permission to perform this action.",
  UNAUTHORIZED: "You are not authorized to perform this action.",
  NOT_ORGANIZATION_MEMBER:
    "You are not a member of the selected organization.",
  NOT_ORGANIZATION_ADMIN:
    "Only an organization administrator can perform this action.",
  NOT_PROJECT_MEMBER: "You do not have access to this project.",
  NOT_CONTRACT_VENDOR:
    "Only the assigned contractor can perform this action.",
  NOT_CONTRACT_AUDITOR:
    "Only the assigned contract auditor can perform this action.",
  NOT_CONTRACT_EXECUTING_AGENCY:
    "Only the assigned executing agency can perform this action.",
};

export const WBS_ERROR_MESSAGES: Record<string, string> = {
  WBS_EMPTY: "WBS is empty. Add at least one task.",
  TASK_CANNOT_PARENT_ITSELF: "A task cannot be its own parent.",
  PARENT_TASK_NOT_FOUND: "Selected parent task was not found.",
  PARENT_TASK_NOT_IN_CONTRACT:
    "Selected parent task belongs to another contract.",
  CHILD_DEADLINE_EXCEEDS_PARENT:
    "Child task deadline cannot exceed its parent deadline.",
  WBS_CYCLE_DETECTED: "This parent selection would create a WBS cycle.",
  ORPHAN_TASK: "WBS contains a task whose parent no longer exists.",
  TOTAL_ROOT_WEIGHT_NOT_100: "Total root task weight should equal 100%.",
  TOTAL_ROOT_WEIGHT_EXCEEDS_100: "Total root task weight exceeds 100%.",
  TOTAL_LEAF_WEIGHT_NOT_100: "Total leaf task weight should equal 100%.",
  TOTAL_LEAF_WEIGHT_EXCEEDS_100: "Total leaf task weight exceeds 100%.",
  SIBLING_WEIGHT_EXCEEDS_100:
    "Total weight among sibling tasks exceeds 100%.",
};

export const FINANCE_ERROR_MESSAGES: Record<string, string> = {
  PENDING_REQUEST_EXISTS:
    "There is already a pending payment request for this project.",
  AMOUNT_EXCEEDS_CONTRACT_VALUE:
    "Payment amount exceeds the contract value.",
  AMOUNT_EXCEEDS_AVAILABLE:
    "Payment amount exceeds the available amount.",
  INVALID_STATUS_TRANSITION:
    "This action is not valid for the current status.",
};

export const UPLOAD_ERROR_MESSAGES: Record<string, string> = {
  FILE_EMPTY: "The selected file is empty.",
  FILE_REQUIRED: "Please select a file to upload.",
  FILE_TOO_LARGE: "The selected file is too large.",
  FILE_TOO_LARGE_5MB_MAX: "File too large. Maximum 5MB allowed.",
  INVALID_FILE_TYPE:
    "Invalid file type. Only JPG, PNG, and PDF files are allowed.",
  USER_NOT_MEMBER_OF_ORGANIZATION:
    "You are not a member of the selected organization.",
  ENTITY_TYPE_AND_ENTITY_ID_REQUIRED_TOGETHER:
    "Upload entity type and entity ID must be provided together.",
};

export const TRACKER_ERROR_MESSAGES: Record<string, string> = {
  TICKET_NOT_FOUND: "Ticket was not found.",
  TICKET_ALREADY_CLOSED: "This ticket is already closed.",
  INVALID_STATUS_VALUE: "Selected ticket status is not valid.",
  INVALID_STATUS_TRANSITION:
    "This action is not valid for the current ticket status.",
  CLOSE_VIA_CLOSE_ENDPOINT:
    "Tickets can only be closed by the executing agency using the close action.",
  NOT_ASSIGNED_TICKET_OWNER:
    "Only the assigned organization can update this ticket.",
};

export const COMMON_ERROR_MESSAGES: Record<string, string> = {
  VALIDATION_FAILED: "Please check the highlighted fields.",
  CONTRACT_NOT_FOUND: "Contract was not found.",
  PROJECT_NOT_FOUND: "Project was not found.",
  ORGANIZATION_NOT_FOUND: "Organization was not found.",
  TASK_NOT_FOUND: "Task was not found.",
  INTERNAL_SERVER_ERROR: "Something went wrong. Please try again.",
};

export const ERROR_MESSAGES: Record<string, string> = {
  ...COMMON_ERROR_MESSAGES,
  ...AUTH_ERROR_MESSAGES,
  ...POLICY_ERROR_MESSAGES,
  ...WBS_ERROR_MESSAGES,
  ...FINANCE_ERROR_MESSAGES,
  ...UPLOAD_ERROR_MESSAGES,
  ...TRACKER_ERROR_MESSAGES,
};

export const getErrorMessage = (code: string | null | undefined): string => {
  if (!code) {
    return "An error occurred.";
  }

  return ERROR_MESSAGES[code] || code;
};
