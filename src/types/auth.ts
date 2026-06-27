/**
 * Authentication types
 */
import type { User, Membership } from "./user";

// Email status enum
export type EmailStatus = "NOT_FOUND" | "SETUP_REQUIRED" | "LOGIN_READY";

// Check email response
export interface CheckEmailResponse {
  status: EmailStatus;
}

// Login request
export interface LoginRequest {
  email: string;
  password: string;
}

// Login response
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  memberships: Membership[];
}

// Set password request
export interface SetPasswordRequest {
  email: string;
  password: string;
  confirmPassword: string;
}

// Set password response
export interface SetPasswordResponse {
  message: string;
}

// Refresh token request
export interface RefreshTokenRequest {
  refreshToken: string;
}

// Refresh token response
export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

// Logout request
export interface LogoutRequest {
  refreshToken: string;
}

// Logout response
export interface LogoutResponse {
  message: string;
}

// Revoke all refresh tokens response
export interface RevokeAllResponse {
  message: string;
}
