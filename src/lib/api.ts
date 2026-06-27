/**
 * API utilities
 * Type-safe API call wrappers with error handling
 */
import axios from "axios";
import { apiClient } from "./axios";
import type { BaseResponse } from "@/types";
import { ApiError, createApiErrorFromAxiosError } from "./api-errors";

export {
  ApiError,
  createApiErrorFromAxiosError,
  getApiErrorCode,
  getApiErrorMessage,
  getRetryAfterSeconds,
  getValidationErrors,
  isApiError,
  isFatalRefreshErrorCode,
  isRateLimitError,
  isValidationError,
  type ApiRateLimitError,
} from "./api-errors";

/**
 * Generic API request handler
 * Unwraps response data and handles errors consistently
 */
export async function apiRequest<T>(
  request: Promise<{ data: BaseResponse<T> }>
): Promise<T> {
  try {
    const response = await request;
    const { data: apiResponse } = response;

    // Check if response is successful (2xx status)
    if (apiResponse.metaData.code >= 200 && apiResponse.metaData.code < 300) {
      return apiResponse.data as T;
    }

    // Throw API error for non-2xx responses
    throw new ApiError(apiResponse);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    // Handle Axios errors
    if (axios.isAxiosError<BaseResponse>(error)) {
      const apiError = createApiErrorFromAxiosError(error);
      if (apiError) {
        throw apiError;
      }
    }

    // Re-throw unknown errors
    throw error;
  }
}

/**
 * API helper methods with type inference
 */
export const api = {
  get: <T>(url: string, config?: Parameters<typeof apiClient.get>[1]) =>
    apiRequest<T>(apiClient.get<BaseResponse<T>>(url, config)),

  post: <T>(
    url: string,
    data?: unknown,
    config?: Parameters<typeof apiClient.post>[2]
  ) => apiRequest<T>(apiClient.post<BaseResponse<T>>(url, data, config)),

  put: <T>(
    url: string,
    data?: unknown,
    config?: Parameters<typeof apiClient.put>[2]
  ) => apiRequest<T>(apiClient.put<BaseResponse<T>>(url, data, config)),

  patch: <T>(
    url: string,
    data?: unknown,
    config?: Parameters<typeof apiClient.patch>[2]
  ) => apiRequest<T>(apiClient.patch<BaseResponse<T>>(url, data, config)),

  delete: <T>(url: string, config?: Parameters<typeof apiClient.delete>[1]) =>
    apiRequest<T>(apiClient.delete<BaseResponse<T>>(url, config)),
};

export default api;
