/**
 * Token storage utilities
 * Handles localStorage operations for JWT tokens
 */
import { STORAGE_KEYS } from "@/constants";

// Check if we're in browser environment
const isBrowser = typeof window !== "undefined";

// Access Token
export const getAccessToken = (): string | null => {
  if (!isBrowser) return null;
  return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
};

export const setAccessToken = (token: string): void => {
  if (!isBrowser) return;
  localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
};

export const removeAccessToken = (): void => {
  if (!isBrowser) return;
  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
};

// Refresh Token
export const getRefreshToken = (): string | null => {
  if (!isBrowser) return null;
  return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
};

export const setRefreshToken = (token: string): void => {
  if (!isBrowser) return;
  localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
};

export const removeRefreshToken = (): void => {
  if (!isBrowser) return;
  localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
};

// Clear all tokens
export const clearTokens = (): void => {
  removeAccessToken();
  removeRefreshToken();
};

// Set both tokens at once
export const setTokens = (accessToken: string, refreshToken: string): void => {
  setAccessToken(accessToken);
  setRefreshToken(refreshToken);
};
