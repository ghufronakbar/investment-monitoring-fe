/**
 * Finance types - Payment requests
 */

// Payment request status enum
export type PaymentRequestStatus =
  | "SUBMITTED"
  | "AUDITOR_APPROVED"
  | "AUDITOR_REJECTED"
  | "AGENCY_APPROVED"
  | "AGENCY_REJECTED"
  | "PAID";

// Approval action enum
export type ApprovalAction = "APPROVE" | "REJECT";

// Approver info
export interface ApproverInfo {
  orgId: string;
  orgName: string;
  userId: string;
  approvedAt: string;
}

// Payment request
export interface PaymentRequest {
  id: string;
  title: string;
  amount: string; // String for BigInt precision
  status: PaymentRequestStatus;
  invoiceFileUrl: string;
  paymentProofImageUrls: string[];
  contractId: string;
  auditor: ApproverInfo | null;
  agency: ApproverInfo | null;
  loanProvider: ApproverInfo | null;
  createdAt: string;
  updatedAt?: string;
}

// Create payment request
export interface CreatePaymentRequestData {
  title: string;
  amount: number;
  invoiceFileUrl: string;
}

// Approve request (auditor/agency)
export interface ApproveRequestData {
  action: ApprovalAction;
}

// Disburse request
export interface DisburseRequestData {
  paymentProofImageUrls: string[];
}

// Payment summary
export interface PaymentSummary {
  contractValue: string;
  paidAmount: string;
  pendingAmount: string;
  availableAmount: string;
  canSubmit: boolean;
  currency: string;
}
