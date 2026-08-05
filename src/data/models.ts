import type { Task } from "@/types/task";

export interface FileUploadResult {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  size: number;
  type: string;
  uploadedAt: string;
}

export interface SearchOptions {
  includeCompleted?: boolean;
  includeDeleted?: boolean;
  includeAbandoned?: boolean;
  limit?: number;
  projectId?: string;
}

export interface SearchResult {
  tasks: Task[];
  totalCount: number;
  searchTime: number;
}

export interface UserSettings {
  deadlineNotificationEnabled?: boolean;
  deadlineNotificationDays?: number;
  webhookUrl?: string;
  webhookEnabled?: boolean;
  [key: string]: unknown;
}

export interface UserProfile {
  id: string;
  username: string;
  avatarUrl?: string | null;
  settings?: UserSettings;
  updatedAt: string;
}

export interface AppInfo {
  version: string;
  announcement?: string;
  maintenanceMode?: boolean;
  contactEmail?: string;
  contactWebsite?: string;
  [key: string]: unknown;
}
