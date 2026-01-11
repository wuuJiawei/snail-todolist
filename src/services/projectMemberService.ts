/**
 * Project Member Service
 * Handles project member operations using the backend API
 */

import { apiClient } from "@/lib/apiClient";

export type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export type ProjectMemberRow = {
  id: string;
  project_id: string | null;
  user_id: string | null;
  role: string;
  created_at: string | null;
  profile?: Profile | null;
};

interface ApiMember {
  id: string;
  list_id: string;
  user_id: string;
  role: string;
  created_at: string;
  user?: {
    id: string;
    email: string;
    username?: string;
    avatar_url?: string;
  };
}

export const listMembers = async (projectId: string): Promise<ProjectMemberRow[]> => {
  try {
    const data = await apiClient.get<ApiMember[]>(`/lists/${projectId}/members`);
    return data.map(m => ({
      id: m.id,
      project_id: m.list_id,
      user_id: m.user_id,
      role: m.role,
      created_at: m.created_at,
      profile: m.user ? {
        id: m.user.id,
        email: m.user.email,
        display_name: m.user.username || null,
        avatar_url: m.user.avatar_url || null,
      } : null,
    }));
  } catch (error) {
    console.error('Failed to list members:', error);
    return [];
  }
};

export const removeMember = async (projectId: string, userId: string): Promise<boolean> => {
  try {
    await apiClient.delete(`/lists/${projectId}/members/${userId}`);
    return true;
  } catch (error) {
    console.error('Failed to remove member:', error);
    return false;
  }
};

export const getProfileById = async (userId: string): Promise<Profile | null> => {
  try {
    const data = await apiClient.get<{ id: string; email: string; username?: string; avatar_url?: string }>(`/user/profile`);
    if (data.id === userId) {
      return {
        id: data.id,
        email: data.email,
        display_name: data.username || null,
        avatar_url: data.avatar_url || null,
      };
    }
    return null;
  } catch (error) {
    console.error('Failed to get profile:', error);
    return null;
  }
};
