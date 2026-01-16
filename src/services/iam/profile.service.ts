/**
 * Profile Service
 * API calls for user profile endpoints
 */
import { api } from "@/lib/api";

export interface Profile {
  id: string;
  name: string;
  email: string;
  imageUrl: string | null;
  memberships: {
    id: string;
    memberRole: "ADMIN" | "MEMBER";
    orgId: string;
    orgName: string;
    orgRole: string;
    orgLogoUrl: string | null;
    createdAt: string;
  }[];
}

export interface UpdateProfileData {
  name: string;
  imageUrl?: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

/**
 * Get current user's profile
 */
export const getProfile = async (): Promise<Profile> => {
  return api.get<Profile>("/iam/profile");
};

/**
 * Update profile (name and image)
 */
export const updateProfile = async (
  data: UpdateProfileData
): Promise<Profile> => {
  return api.put<Profile>("/iam/profile", data);
};

/**
 * Change password
 */
export const changePassword = async (
  data: ChangePasswordData
): Promise<{ message: string }> => {
  return api.put<{ message: string }>("/iam/profile/password", data);
};
