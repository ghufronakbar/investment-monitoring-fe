/**
 * Base API response types matching backend format
 */

// Response metadata
export interface MetaData {
  code: number;
  message: string;
  requestId: string;
  path: string;
  method: string;
}

// Pagination info - use optional chaining when accessing (obj?.page)
export interface PaginationInfo {
  page?: number;
  limit?: number;
  totalItems?: number;
  totalPages?: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}

// Filter query params - use optional chaining when accessing (obj?.search)
export interface FilterQuery {
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  [key: string]: unknown;
}

// Base response wrapper - T is the data type
export interface BaseResponse<T = unknown> {
  metaData: MetaData;
  responseMessage: string;
  data: T | null;
  validationErrors: Record<string, string> | null;
  filterQuery?: FilterQuery | null;
  pagination?: PaginationInfo | null;
}

// List response helper type
export type ListResponse<T> = BaseResponse<T[]>;

// Single item response helper type
export type SingleResponse<T> = BaseResponse<T>;
