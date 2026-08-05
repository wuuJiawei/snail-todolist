/**
 * Legacy adapter types kept private to the Supabase provider during incremental migration.
 * Defines the common interface for all storage operations
 * Compatibility types used only inside the Supabase provider.
 */

import { Task } from '@/types/task';
import { Project } from '@/types/project';

/**
 * Filter options for querying tasks
 */
export interface TaskFilter {
  projectId?: string;
  completed?: boolean;
  deleted?: boolean;
  abandoned?: boolean;
  flagged?: boolean;
  userId?: string;
}

/**
 * Pomodoro session record
 */
export interface PomodoroSession {
  id: string;
  task_id?: string | null;
  user_id?: string;
  duration: number;
  type: 'work' | 'short_break' | 'long_break';
  started_at: string;
  completed_at?: string | null;
  created_at: string;
  notes?: string | null;
  title?: string | null;
}

/**
 * Task activity record for tracking changes
 */
export interface TaskActivity {
  id: string;
  task_id: string;
  user_id?: string;
  action: string;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

/**
 * Check-in record for daily check-ins
 */
export interface CheckInRecord {
  id: string;
  user_id?: string;
  check_in_time: string;
  note?: string | null;
  created_at: string;
}

/**
 * Input type for creating a new task (without id)
 */
export type CreateTaskInput = Omit<Task, 'id'>;

/**
 * Input type for creating a new project (without id)
 */
export type CreateProjectInput = Omit<Project, 'id' | 'count'>;

/**
 * Input type for creating a new pomodoro session (without id)
 */
export type CreatePomodoroInput = Omit<PomodoroSession, 'id' | 'created_at'>;

/**
 * Input type for creating a new task activity (without id)
 */
export type CreateActivityInput = Omit<TaskActivity, 'id' | 'created_at'>;

/**
 * File upload result
 */
export interface FileUploadResult {
  id: string;
  filename: string;
  original_name: string;
  url: string;
  size: number;
  type: string;
  uploaded_at: string;
}

/**
 * Search options for task search
 */
export interface SearchOptions {
  includeCompleted?: boolean;
  includeDeleted?: boolean;
  includeAbandoned?: boolean;
  limit?: number;
  projectFilter?: string;
}

/**
 * Search result
 */
export interface SearchResult {
  tasks: Task[];
  totalCount: number;
  searchTime: number;
}

/**
 * User settings for notifications and preferences
 */
export interface UserSettings {
  deadline_notification_enabled?: boolean;
  deadline_notification_days?: number;
  webhook_url?: string;
  webhook_enabled?: boolean;
  [key: string]: unknown;
}

/**
 * Application info
 */
export interface AppInfo {
  version: string;
  announcement?: string;
  maintenance_mode?: boolean;
  [key: string]: unknown;
}
/** User profile stored in Supabase auth metadata. */
export interface UserProfile {
  id: string;
  username: string;
  avatar_url?: string | null;
  settings?: UserSettings;
  updated_at: string;
}
