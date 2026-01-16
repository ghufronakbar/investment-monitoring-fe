/**
 * Payment Service
 * API calls for payment request and disbursement endpoints
 */
import { api } from "@/lib/api";
import type {
  PaymentRequest,
  PaymentSummary,
  CreatePaymentRequestData,
  ApproveRequestData,
  DisburseRequestData,
} from "@/types";

/**
 * Create payment request
 * Only CONTRACTOR can create
 */
export const createPaymentRequest = async (
  projectId: string,
  data: CreatePaymentRequestData
): Promise<PaymentRequest> => {
  return api.post<PaymentRequest>(
    `/finance/project/${projectId}/request`,
    data
  );
};

/**
 * Get all payment requests for a project
 */
export const getPaymentRequests = async (
  projectId: string
): Promise<PaymentRequest[]> => {
  return api.get<PaymentRequest[]>(`/finance/project/${projectId}/request`);
};

/**
 * Get payment request detail
 */
export const getPaymentRequestDetail = async (
  requestId: string
): Promise<PaymentRequest> => {
  return api.get<PaymentRequest>(`/finance/request/${requestId}`);
};

/**
 * Approve/reject by auditor (technical verification)
 * Only INDEPENDENT_AUDITOR can approve
 */
export const approveByAuditor = async (
  requestId: string,
  data: ApproveRequestData
): Promise<PaymentRequest> => {
  return api.put<PaymentRequest>(
    `/finance/request/${requestId}/approve-auditor`,
    data
  );
};

/**
 * Approve/reject by agency (administrative verification)
 * Only EXECUTING_AGENCY can approve
 */
export const approveByAgency = async (
  requestId: string,
  data: ApproveRequestData
): Promise<PaymentRequest> => {
  return api.put<PaymentRequest>(
    `/finance/request/${requestId}/approve-agency`,
    data
  );
};

/**
 * Disburse payment (mark as paid)
 * Only LOAN_PROVIDER can disburse
 */
export const disbursePayment = async (
  requestId: string,
  data: DisburseRequestData
): Promise<PaymentRequest> => {
  return api.put<PaymentRequest>(
    `/finance/request/${requestId}/disburse`,
    data
  );
};

/**
 * Get payment summary for a project
 */
export const getPaymentSummary = async (
  projectId: string
): Promise<PaymentSummary> => {
  return api.get<PaymentSummary>(`/finance/project/${projectId}/summary`);
};
