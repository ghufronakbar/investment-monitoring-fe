/**
 * Upload Service
 * API calls for file upload endpoints
 */
import { apiClient } from "@/lib/axios";
import { apiRequest } from "@/lib/api";
import type { BaseResponse, UploadOptions, UploadResponse } from "@/types";

const ENTITY_BINDING_ERROR = "ENTITY_TYPE_AND_ENTITY_ID_REQUIRED_TOGETHER";

const appendUploadOptions = (
  formData: FormData,
  options?: UploadOptions
): void => {
  if (!options) {
    return;
  }

  const hasEntityType = !!options.entityType?.trim();
  const hasEntityId = !!options.entityId?.trim();

  if (hasEntityType !== hasEntityId) {
    throw new Error(ENTITY_BINDING_ERROR);
  }

  if (options.organizationId) {
    formData.append("organizationId", options.organizationId);
  }

  if (options.entityType && options.entityId) {
    formData.append("entityType", options.entityType);
    formData.append("entityId", options.entityId);
  }
};

/**
 * Upload single file
 * @param file - File to upload (image or PDF)
 * @param options - Optional metadata for organization/entity binding
 * @returns Upload response with URL
 */
export const uploadSingle = async (
  file: File,
  options?: UploadOptions
): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append("file", file);
  appendUploadOptions(formData, options);

  return apiRequest<UploadResponse>(
    apiClient.post<BaseResponse<UploadResponse>>(
      "/support/upload/single",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    )
  );
};

/**
 * Upload multiple files
 * @param files - Array of files to upload (max 10)
 * @param options - Optional metadata for organization/entity binding
 * @returns Array of upload responses with URLs
 */
export const uploadMultiple = async (
  files: File[],
  options?: UploadOptions
): Promise<UploadResponse[]> => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append("files", file);
  });
  appendUploadOptions(formData, options);

  return apiRequest<UploadResponse[]>(
    apiClient.post<BaseResponse<UploadResponse[]>>(
      "/support/upload/multiple",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    )
  );
};
