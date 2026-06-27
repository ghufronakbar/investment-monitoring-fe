/**
 * Services Export
 * All API services organized by module
 */

// Module namespaces
export * as iamService from "./iam";
export * as projectService from "./project";
export * as monitoringService from "./monitoring";
export * as trackerService from "./tracker";
export * as financeService from "./finance";
export * as supportService from "./support";

// ============================================
// IAM Module (Auth & Organization)
// ============================================
export {
  checkEmail,
  login,
  setPassword,
  refreshToken,
  logout,
  revokeAllRefreshTokens,
} from "./iam/auth.service";

export {
  getRegisteredOrganizations,
  getMyOrganizations,
  getOrganization,
  getOrganizationMembers,
  createOrganization,
  inviteMember,
  updateOrganization,
} from "./iam/organization.service";

export {
  getProfile,
  updateProfile,
  changePassword,
} from "./iam/profile.service";

// ============================================
// Project Module
// ============================================
export {
  createProject,
  getProjects,
  getProjectDetail,
  configureSettings,
  assignExecutingAgency,
  assignVendor,
  assignAuditor,
  assignGovPartners,
} from "./project/project.service";

// ============================================
// Monitoring Module (Task & Progress)
// ============================================
export {
  createTask,
  getTasks,
  getLeafTasks,
  getWBSValidation,
  updateTask,
  deleteTask,
} from "./monitoring/task.service";

export {
  submitProgress,
  getProgressLogs,
  getPendingValidations,
  validateProgress,
  getSCurveData,
} from "./monitoring/progress.service";

// ============================================
// Tracker Module (Tickets)
// ============================================
export {
  createTicket,
  getTickets,
  getTicketDetail,
  assignTicket,
  addTicketLog,
  closeTicket,
} from "./tracker/ticket.service";

// ============================================
// Finance Module (Payments)
// ============================================
export {
  createPaymentRequest,
  getPaymentRequests,
  getPaymentRequestDetail,
  approveByAuditor,
  approveByAgency,
  disbursePayment,
  getPaymentSummary,
} from "./finance/payment.service";

// ============================================
// Support Module (Upload & Dashboard)
// ============================================
export { uploadSingle, uploadMultiple } from "./support/upload.service";

export {
  getSCurveDashboard,
  getDashboardStats,
} from "./support/dashboard.service";

// ============================================
// Realtime Module
// ============================================
export { RealtimeWebSocketClient } from "./realtime";
