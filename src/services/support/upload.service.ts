/**
 * Upload Service
 * API calls for file upload endpoints
 */
import { apiClient } from "@/lib/axios";
import type { BaseResponse, UploadResponse } from "@/types";

/**
 * Upload single file
 * @param file - File to upload (image or PDF)
 * @returns Upload response with URL
 */
export const uploadSingle = async (file: File): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiClient.post<BaseResponse<UploadResponse>>(
    "/support/upload/single",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  if (response.data.metaData.code >= 200 && response.data.metaData.code < 300) {
    return response.data.data as UploadResponse;
  }

  throw new Error(response.data.responseMessage);
};

/**
 * Upload multiple files
 * @param files - Array of files to upload (max 10)
 * @returns Array of upload responses with URLs
 */
export const uploadMultiple = async (
  files: File[]
): Promise<UploadResponse[]> => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append("files", file);
  });

  const response = await apiClient.post<BaseResponse<UploadResponse[]>>(
    "/support/upload/multiple",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  if (response.data.metaData.code >= 200 && response.data.metaData.code < 300) {
    return response.data.data as UploadResponse[];
  }

  throw new Error(response.data.responseMessage);
};
