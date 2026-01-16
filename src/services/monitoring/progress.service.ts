/**
 * Progress Service
 * API calls for progress logging and validation endpoints
 */
import { api } from "@/lib/api";
import type {
  ProgressLog,
  ProgressValidation,
  SubmitProgressRequest,
  ValidateProgressRequest,
  SCurveData,
} from "@/types";

/**
 * Submit progress on a leaf task
 * Only CONTRACTOR can submit
 */
export const submitProgress = async (
  taskId: string,
  data: SubmitProgressRequest
): Promise<ProgressLog> => {
  return api.post<ProgressLog>(`/monitoring/task/${taskId}/log`, data);
};

/**
 * Get all progress logs for a project
 */
export const getProgressLogs = async (
  projectId: string
): Promise<ProgressLog[]> => {
  return api.get<ProgressLog[]>(`/monitoring/project/${projectId}/log`);
};

/**
 * Get pending validations (for auditor queue)
 * Only INDEPENDENT_AUDITOR can access
 */
export const getPendingValidations = async (
  projectId: string
): Promise<ProgressLog[]> => {
  return api.get<ProgressLog[]>(`/monitoring/project/${projectId}/log/pending`);
};

/**
 * Validate progress log
 * Only INDEPENDENT_AUDITOR can validate
 */
export const validateProgress = async (
  logId: string,
  data: ValidateProgressRequest
): Promise<ProgressValidation> => {
  return api.post<ProgressValidation>(
    `/monitoring/log/${logId}/validate`,
    data
  );
};

/**
 * Get S-Curve data for project
 */
export const getSCurveData = async (projectId: string): Promise<SCurveData> => {
  return api.get<SCurveData>(`/monitoring/project/${projectId}/scurve`);
};
