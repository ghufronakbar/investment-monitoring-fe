/**
 * Monitoring types - Tasks (WBS) & Progress Logs
 */

// Task item in WBS
export interface TaskItem {
  id: string;
  title: string;
  description: string;
  deadline: string;
  weight: number;
  parentId: string | null;
  contractId: string;
  children: TaskItem[] | null;
  isLeaf: boolean;
  claimedPercentage: number;
  actualPercentage: number;
  isCompleted: boolean;
  createdAt: string;
}

// Tasks tree response
export interface TasksTreeResponse {
  tasks: TaskItem[];
  totalWeight: number;
}

export interface WBSValidation {
  isValid: boolean;
  totalRootWeight: number;
  totalLeafWeight: number;
  errors: string[];
}

// Create task request
export interface CreateTaskRequest {
  title: string;
  description: string;
  deadline: string;
  weight: number;
  parentId?: string | null;
}

// Update task request
export interface UpdateTaskRequest {
  title: string;
  description: string;
  deadline: string;
  weight: number;
  parentId?: string | null;
}

// Progress validation
export interface ProgressValidation {
  id: string;
  isAccepted: boolean;
  claimedPercentage: number;
  realProgressPercentage: number;
  comment: string | null;
  auditorId: string;
  createdAt: string;
}

// Progress log
export interface ProgressLog {
  id: string;
  report: string;
  progressPercentage: number;
  evidenceImageUrls: string[];
  snapshotTitle: string;
  snapshotDescription: string;
  snapshotWeight: number;
  taskItemId: string;
  taskTitle?: string;
  vendorId: string;
  vendorName?: string;
  validation: ProgressValidation | null;
  createdAt: string;
}

// Submit progress request
export interface SubmitProgressRequest {
  progressPercentage: number;
  report: string;
  evidenceImageUrls: string[];
}

// Validate progress request
export interface ValidateProgressRequest {
  realProgressPercentage: number;
  comment?: string | null;
}

// S-Curve data
export interface SCurveData {
  actualProgress: number;
  plannedProgress: number;
  totalSnapshotWeight: number;
  totalLogs: number;
  approvedLogs: number;
  rejectedLogs: number;
  taskDetails: {
    taskId: string;
    taskTitle: string;
    plannedWeight: number;
    deadline: string;
    actualPercentage: number;
    claimedPercentage: number;
  }[];
}
