/**
 * IAM Auth Service
 * API calls for authentication endpoints
 */
import { api } from "@/lib/api";
import { apiClient } from "@/lib/axios";
import { setTokens, clearTokens } from "@/lib/auth";
import { ENV } from "@/constants";
import type {
  BaseResponse,
  CheckEmailResponse,
  LoginRequest,
  LoginResponse,
  SetPasswordRequest,
  SetPasswordResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
} from "@/types";

/**
 * Check email status to determine auth flow
 * - NOT_FOUND: Email not registered
 * - SETUP_REQUIRED: Need to set password
 * - LOGIN_READY: Can login with password
 */
export const checkEmail = async (
  email: string
): Promise<CheckEmailResponse> => {
  return api.post<CheckEmailResponse>("/iam/auth/check-email", { email });
};

/**
 * Login with email and password
 * Automatically stores tokens on success
 */
export const login = async (data: LoginRequest): Promise<LoginResponse> => {
  const response = await api.post<LoginResponse>("/iam/auth/login", data);

  // Store tokens
  setTokens(response.accessToken, response.refreshToken);

  return response;
};

/**
 * Set password for invited user
 */
export const setPassword = async (
  data: SetPasswordRequest
): Promise<SetPasswordResponse> => {
  return api.post<SetPasswordResponse>("/iam/auth/set-password", data);
};

/**
 * Refresh access token
 * Note: This is called directly by axios interceptor,
 * but exposed here for manual use if needed
 */
export const refreshToken = async (
  data: RefreshTokenRequest
): Promise<RefreshTokenResponse> => {
  // Use raw axios to avoid interceptor loop
  const response = await apiClient.post<BaseResponse<RefreshTokenResponse>>(
    `${ENV.API_URL}/iam/auth/refresh-token`,
    data
  );

  if (response.data.data) {
    setTokens(response.data.data.accessToken, response.data.data.refreshToken);
    return response.data.data;
  }

  throw new Error("Failed to refresh token");
};

/**
 * Logout - clear all tokens
 */
export const logout = (): void => {
  clearTokens();
};
