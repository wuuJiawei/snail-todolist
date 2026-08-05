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
 * Input type for creating a new task (without id)
 */
export type CreateTaskInput = Omit<Task, 'id'>;

/**
 * Input type for creating a new project (without id)
 */
export type CreateProjectInput = Omit<Project, 'id' | 'count'>;
