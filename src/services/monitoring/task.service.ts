/**
 * Task Service (WBS Management)
 * API calls for task/WBS endpoints
 */
import { api } from "@/lib/api";
import type {
  TaskItem,
  TasksTreeResponse,
  CreateTaskRequest,
  UpdateTaskRequest,
} from "@/types";

/**
 * Create new task in WBS
 * Only EXECUTING_AGENCY ADMIN can create
 */
export const createTask = async (
  projectId: string,
  data: CreateTaskRequest
): Promise<TaskItem> => {
  return api.post<TaskItem>(`/monitoring/project/${projectId}/task`, data);
};

/**
 * Get all tasks in tree view
 */
export const getTasks = async (
  projectId: string
): Promise<TasksTreeResponse> => {
  return api.get<TasksTreeResponse>(`/monitoring/project/${projectId}/task`);
};

/**
 * Get only leaf tasks (for progress submission)
 */
export const getLeafTasks = async (projectId: string): Promise<TaskItem[]> => {
  return api.get<TaskItem[]>(`/monitoring/project/${projectId}/task/leaf`);
};

/**
 * Update task
 * Only EXECUTING_AGENCY ADMIN can update
 */
export const updateTask = async (
  taskId: string,
  data: UpdateTaskRequest
): Promise<TaskItem> => {
  return api.put<TaskItem>(`/monitoring/task/${taskId}`, data);
};

/**
 * Delete task
 * Only EXECUTING_AGENCY ADMIN can delete
 */
export const deleteTask = async (taskId: string): Promise<null> => {
  return api.delete<null>(`/monitoring/task/${taskId}`);
};
