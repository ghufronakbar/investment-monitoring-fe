import type { PaymentRequestStatus } from "@/types";
import { FINANCE_ERROR_MESSAGES, getErrorMessage } from "./error-messages";

export { FINANCE_ERROR_MESSAGES };

export const getFinanceErrorMessage = (code: string): string => {
  return getErrorMessage(code);
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
