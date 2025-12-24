/**
 * Storage Adapter Interface
 * Defines the common interface for all storage operations
 * Supports both Supabase (online) and IndexedDB (offline) implementations
 */

import { Task } from '@/types/task';
import { Project } from '@/types/project';
import { Tag, TaskTagLink } from '@/types/tag';

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
 * Sort options for ordering results
 */
export interface SortOptions {
  field: 'sort_order' | 'created_at' | 'updated_at' | 'deleted_at' | 'abandoned_at' | 'completed_at';
  direction: 'asc' | 'desc';
  nullsFirst?: boolean;
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
 * Storage Adapter Interface
 * All storage implementations must implement this interface
 */
export interface StorageAdapter {
  /**
   * Initialize the storage backend
   * Must be called before any other operations
   */
  initialize(): Promise<void>;

  /**
   * Check if the storage is initialized and ready
   */
  isReady(): boolean;

  // ============================================
  // Task Operations
  // ============================================

  /**
   * Get all tasks matching the filter criteria
   */
  getTasks(filter?: TaskFilter, sort?: SortOptions[]): Promise<Task[]>;

  /**
   * Get a single task by ID
   */
  getTaskById(id: string): Promise<Task | null>;

  /**
   * Create a new task
   */
  createTask(task: CreateTaskInput): Promise<Task>;

  /**
   * Update an existing task
   */
  updateTask(id: string, updates: Partial<Task>): Promise<Task | null>;

  /**
   * Permanently delete a task
   */
  deleteTask(id: string): Promise<boolean>;

  /**
   * Batch update sort_order for multiple tasks
   * Used for drag-and-drop reordering
   */
  batchUpdateSortOrder(updates: Array<{ id: string; sort_order: number }>): Promise<boolean>;

  // ============================================
  // Project Operations
  // ============================================

  /**
   * Get all projects
   */
  getProjects(): Promise<Project[]>;

  /**
   * Get a single project by ID
   */
  getProjectById(id: string): Promise<Project | null>;

  /**
   * Create a new project
   */
  createProject(project: CreateProjectInput): Promise<Project>;

  /**
   * Update an existing project
   */
  updateProject(id: string, updates: Partial<Project>): Promise<Project | null>;

  /**
   * Delete a project and optionally update associated tasks
   */
  deleteProject(id: string): Promise<boolean>;

  /**
   * Batch update sort_order for multiple projects
   */
  batchUpdateProjectSortOrder(updates: Array<{ id: string; sort_order: number }>): Promise<boolean>;

  // ============================================
  // Tag Operations
  // ============================================

  /**
   * Get all tags, optionally filtered by project
   * @param projectId - If provided, returns tags for that project; if null, returns global tags
   */
  getTags(projectId?: string | null): Promise<Tag[]>;

  /**
   * Get a single tag by ID
   */
  getTagById(id: string): Promise<Tag | null>;

  /**
   * Create a new tag
   */
  createTag(name: string, projectId?: string | null): Promise<Tag>;

  /**
   * Update an existing tag
   */
  updateTag(id: string, updates: Partial<Tag>): Promise<Tag | null>;

  /**
   * Delete a tag and remove all task associations
   */
  deleteTag(id: string): Promise<boolean>;

  // ============================================
  // Task-Tag Operations
  // ============================================

  /**
   * Get tags for multiple tasks
   * @returns A map of task_id to array of tags
   */
  getTagsByTaskIds(taskIds: string[]): Promise<Record<string, Tag[]>>;

  /**
   * Attach a tag to a task
   */
  attachTagToTask(taskId: string, tagId: string): Promise<void>;

  /**
   * Detach a tag from a task
   */
  detachTagFromTask(taskId: string, tagId: string): Promise<void>;

  // ============================================
  // Pomodoro Operations
  // ============================================

  /**
   * Get pomodoro sessions, optionally filtered by task
   */
  getPomodoroSessions(taskId?: string): Promise<PomodoroSession[]>;

  /**
   * Get a single pomodoro session by ID
   */
  getPomodoroSessionById(id: string): Promise<PomodoroSession | null>;

  /**
   * Create a new pomodoro session
   */
  createPomodoroSession(session: CreatePomodoroInput): Promise<PomodoroSession>;

  /**
   * Update an existing pomodoro session
   */
  updatePomodoroSession(id: string, updates: Partial<PomodoroSession>): Promise<PomodoroSession | null>;

  /**
   * Delete a pomodoro session
   */
  deletePomodoroSession(id: string): Promise<boolean>;

  // ============================================
  // Activity Operations
  // ============================================

  /**
   * Get all activities for a task
   */
  getTaskActivities(taskId: string): Promise<TaskActivity[]>;

  /**
   * Create a new task activity record
   */
  createTaskActivity(activity: CreateActivityInput): Promise<TaskActivity>;
}

/**
 * Database store names for IndexedDB
 */
export const DB_STORES = {
  TASKS: 'tasks',
  PROJECTS: 'projects',
  TAGS: 'tags',
  TASK_TAGS: 'task_tags',
  POMODORO_SESSIONS: 'pomodoro_sessions',
  TASK_ACTIVITIES: 'task_activities',
} as const;

export type DBStoreName = typeof DB_STORES[keyof typeof DB_STORES];
