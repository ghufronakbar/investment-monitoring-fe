import type { PaymentRequestStatus } from "@/types";

export const FINANCE_ERROR_MESSAGES: Record<string, string> = {
  PENDING_REQUEST_EXISTS:
    "There is already a pending payment request for this project.",
  AMOUNT_EXCEEDS_CONTRACT_VALUE:
    "Payment amount exceeds the contract value.",
  AMOUNT_EXCEEDS_AVAILABLE:
    "Payment amount exceeds the available amount.",
  INVALID_STATUS_TRANSITION:
    "This action is not valid for the current payment status.",
  NOT_CONTRACT_AUDITOR:
    "Only the assigned contract auditor can perform this action.",
  NOT_CONTRACT_EXECUTING_AGENCY:
    "Only the assigned executing agency can perform this action.",
  NOT_CONTRACT_VENDOR:
    "Only the assigned contractor can create payment requests.",
};

export const getFinanceErrorMessage = (code: string): string => {
  return FINANCE_ERROR_MESSAGES[code] || code;
};

export const isTerminalPaymentStatus = (
  status: PaymentRequestStatus
): boolean => {
  return (
    status === "AUDITOR_REJECTED" ||
    status === "AGENCY_REJECTED" ||
    status === "PAID"
  );
};

export const canAuditorAct = (status: PaymentRequestStatus): boolean => {
  return status === "SUBMITTED";
};

export const canAgencyAct = (status: PaymentRequestStatus): boolean => {
  return status === "AUDITOR_APPROVED";
};

export const canLoanProviderAct = (status: PaymentRequestStatus): boolean => {
  return status === "AGENCY_APPROVED";
};
