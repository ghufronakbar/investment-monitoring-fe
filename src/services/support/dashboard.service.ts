/**
 * Dashboard Service
 * API calls for dashboard and analytics endpoints
 */
import { api } from "@/lib/api";
import type { SCurveDashboard, DashboardStats } from "@/types";

/**
 * Get S-Curve data for visualization
 * Returns weekly data points for plan vs actual progress
 */
export const getSCurveDashboard = async (
  projectId: string
): Promise<SCurveDashboard> => {
  return api.get<SCurveDashboard>(`/support/dashboard/s-curve/${projectId}`);
};

/**
 * Get dashboard statistics
 * Returns high-level project overview stats
 */
export const getDashboardStats = async (
  projectId: string
): Promise<DashboardStats> => {
  return api.get<DashboardStats>(`/support/dashboard/stats/${projectId}`);
};
