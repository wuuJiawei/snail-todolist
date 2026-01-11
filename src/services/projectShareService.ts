/**
 * Project Share Service
 * Handles project sharing operations using the backend API
 */

import { apiClient } from "@/lib/apiClient";

interface ProjectShare {
  id: string;
  share_code: string;
  expires_at: string;
  is_active: boolean;
}

export const getOrCreateActiveShare = async (projectId: string, _userId: string): Promise<ProjectShare | null> => {
  try {
    const data = await apiClient.get<ProjectShare>(`/lists/${projectId}/share`);
    return data;
  } catch (error) {
    console.error('Failed to get or create share:', error);
    return null;
  }
};

export const deactivateShare = async (projectId: string): Promise<boolean> => {
  try {
    await apiClient.delete(`/lists/${projectId}/share`);
    return true;
  } catch (error) {
    console.error('Failed to deactivate share:', error);
    return false;
  }
};

export const joinByShareCode = async (shareCode: string): Promise<boolean> => {
  try {
    await apiClient.post('/share/join', { share_code: shareCode });
    return true;
  } catch (error) {
    console.error('Failed to join by share code:', error);
    return false;
  }
};
