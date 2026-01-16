/**
 * Support types - Upload & Dashboard
 */

// Upload response
export interface UploadResponse {
  publicId: string;
  url: string;
  format: string;
}

// S-Curve data point
export interface SCurveDataPoint {
  date: string;
  plan: number;
  actual: number;
}

// S-Curve dashboard response
export interface SCurveDashboard {
  projectName: string;
  startDate: string;
  baselineDeadline: string;
  dataPoints: SCurveDataPoint[];
}

// Ticket stats
export interface TicketStats {
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  total: number;
}

// Dashboard stats response
export interface DashboardStats {
  projectName: string;
  totalBudget: string;
  disbursedAmount: string;
  currency: string;
  physicalProgress: number;
  ticketStats: TicketStats;
}
