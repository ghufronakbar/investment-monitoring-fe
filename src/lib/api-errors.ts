/**
 * Shared API error helpers.
 */
import axios, { type AxiosError } from "axios";
import type { BaseResponse } from "@/types";

const REFRESH_AUTH_ERROR_CODES = new Set([
  "INVALID_REFRESH_TOKEN",
  "INVALID_REFRESH_TOKEN_CLAIMS",
  "REFRESH_TOKEN_REVOKED",
  "USER_NOT_FOUND",
]);

/**
 * API Error class for typed error handling.
 */
export class ApiError extends Error {
  public code: number;
  public responseMessage: string;
  public validationErrors: Record<string, string> | null;
  public requestId: string;
  public retryAfterSeconds: number | null;

  constructor(response: BaseResponse, retryAfterSeconds: number | null = null) {
    super(response.metaData.message);
    this.name = "ApiError";
    this.code = response.metaData.code;
    this.responseMessage = response.responseMessage;
    this.validationErrors = response.validationErrors;
    this.requestId = response.metaData.requestId;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export type ApiRateLimitError = ApiError & {
  responseMessage: "RATE_LIMIT_EXCEEDED";
  retryAfterSeconds: number | null;
};

/**
 * Check if error is an API error.
 */
export const isApiError = (error: unknown): error is ApiError => {
  return error instanceof ApiError;
};

/**
 * Check if error is a validation error with field errors.
 */
export const isValidationError = (
  error: unknown
): error is ApiError & { validationErrors: Record<string, string> } => {
  return isApiError(error) && error.validationErrors !== null;
};

export const isRateLimitError = (
  error: unknown
): error is ApiRateLimitError => {
  return isApiError(error) && error.responseMessage === "RATE_LIMIT_EXCEEDED";
};

export const getRetryAfterSeconds = (
  error: unknown
): number | null => {
  if (isApiError(error)) {
    return error.retryAfterSeconds;
  }

  if (!axios.isAxiosError(error)) {
    return null;
  }

  const retryAfter = error.response?.headers?.["retry-after"];
  const value = Array.isArray(retryAfter) ? retryAfter[0] : retryAfter;

  if (typeof value !== "string") {
    return null;
  }

  const seconds = Number(value);
  if (Number.isFinite(seconds)) {
    return Math.max(0, seconds);
  }

  const retryDate = Date.parse(value);
  if (Number.isNaN(retryDate)) {
    return null;
  }

  return Math.max(0, Math.ceil((retryDate - Date.now()) / 1000));
};

export const getApiErrorCode = (error: unknown): string | null => {
  if (isApiError(error)) {
    return error.responseMessage;
  }

  if (!axios.isAxiosError(error)) {
    return null;
  }

  const data = error.response?.data as BaseResponse | undefined;
  return data?.responseMessage ?? null;
};

export const getValidationErrors = (
  error: unknown
): Record<string, string> | null => {
  if (isApiError(error)) {
    return error.validationErrors;
  }

  if (!axios.isAxiosError(error)) {
    return null;
  }

  const data = error.response?.data as BaseResponse | undefined;
  return data?.validationErrors ?? null;
};

export const createApiErrorFromAxiosError = (
  error: AxiosError<BaseResponse>
): ApiError | null => {
  if (!error.response?.data) {
    return null;
  }

  return new ApiError(error.response.data, getRetryAfterSeconds(error));
};

export const isFatalRefreshErrorCode = (code: string | null): boolean => {
  return code !== null && REFRESH_AUTH_ERROR_CODES.has(code);
};
