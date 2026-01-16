/**
 * Auth helper exports
 */
export * from "./tokens";

import { getAccessToken, getRefreshToken } from "./tokens";

/**
 * Check if user is authenticated (has valid tokens)
 * Note: This only checks if tokens exist, not if they're valid/expired
 */
export const isAuthenticated = (): boolean => {
  const accessToken = getAccessToken();
  return !!accessToken;
};

/**
 * Check if user can refresh token
 */
export const canRefreshToken = (): boolean => {
  const refreshToken = getRefreshToken();
  return !!refreshToken;
};
