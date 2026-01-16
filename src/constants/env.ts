/**
 * Environment variables - centralized access point
 * Never call process.env directly in code, always use this module
 */
export const ENV = {
  API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:7777",
} as const;
