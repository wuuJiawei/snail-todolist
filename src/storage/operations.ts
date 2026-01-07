/**
 * Storage Operations Module
 * Provides unified task/tag/project operations that work in both online and offline modes
 * 
 * This module uses the Strategy pattern - it delegates all operations to the storage adapter
 * which is determined at initialization time based on configuration.
 * 
 * The upper layers (contexts, components) should ONLY use this module for data operations,
 * never directly checking isOfflineMode or calling storage adapters directly.
 */

import { Task } from '@/types/task';
import { Tag } from '@/types/tag';
import { Project } from '@/types/project';
import { PomodoroSession, TaskActivity, CheckInRecord, CreatePomodoroInput, CreateActivityInput } from './types';
import { getStorage, initializeStorage, isOfflineMode } from './index';
import { toast } from '@/hooks/use-toast';
import type { User } from '@supabase/supabase-js';

// ============================================
// Helper Functions
// ============================================

/**
 * Ensure storage is initialized before operations
 */
async function ensureStorage() {
  await initializeStorage();
  return getStorage();
}

/**
 * Check if the current context can perform data operations.
 * Returns true if:
 * - In offline mode (uses mock user, no auth required)
 * - User is authenticated in online mode
 * 
 * Use this to replace `!!user || isOfflineMode` pattern in contexts/components.
 */
export function canPerformOperation(user: User | null): boolean {
  return isOfflineMode || !!user;
}

/**
 * Check if authentication is required but missing.
 * Returns true if in online mode and user is not authenticated.
 * 
 * Use this to replace `!user && !isOfflineMode` pattern for showing auth errors.
 */
export function requiresAuth(user: User | null): boolean {
  return !isOfflineMode && !user;
}

// ============================================
// Task Operations
// ============================================

export async function fetchTasks(includeDeleted = false): Promise<Task[]> {
  try {
    const storage = await ensureStorage();
    if (includeDeleted) {
      return await storage.getTasks();
    }
    return await storage.getTasks({ deleted: false });
  } catch (error) {
    console.error('Failed to fetch tasks:', error);
    return [];
  }
}

export async function fetchDeletedTasks(): Promise<Task[]> {
  try {
    const storage = await ensureStorage();
    return await storage.getTasks({ deleted: true, abandoned: false });
  } catch (error) {
    console.error('Failed to fetch deleted tasks:', error);
    return [];
  }
}

export async function fetchAbandonedTasks(): Promise<Task[]> {
  try {
    const storage = await ensureStorage();
    return await storage.getTasks({ abandoned: true });
  } catch (error) {
    console.error('Failed to fetch abandoned tasks:', error);
    return [];
  }
}

export async function addTask(task: Omit<Task, 'id'>): Promise<Task | null> {
  try {
    const storage = await ensureStorage();
    return await storage.createTask(task);
  } catch (error) {
    console.error('Failed to add task:', error);
    toast({
      title: '添加失败',
      description: '无法添加任务，请稍后再试',
      variant: 'destructive',
    });
    return null;
  }
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
  try {
    const storage = await ensureStorage();
    return await storage.updateTask(id, updates);
  } catch (error) {
    console.error('Failed to update task:', error);
    toast({
      title: '更新失败',
      description: '无法更新任务，请稍后再试',
      variant: 'destructive',
    });
    return null;
  }
}

export async function deleteTask(id: string): Promise<boolean> {
  try {
    const storage = await ensureStorage();
    return await storage.deleteTask(id);
  } catch (error) {
    console.error('Failed to delete task:', error);
    toast({
      title: '删除失败',
      description: '无法删除任务，请稍后再试',
      variant: 'destructive',
    });
    return false;
  }
}

export async function moveToTrash(id: string): Promise<boolean> {
  try {
    const storage = await ensureStorage();
    const result = await storage.updateTask(id, {
      deleted: true,
      deleted_at: new Date().toISOString(),
    });
    if (result) {
      toast({ title: '删除成功', description: '任务已移至垃圾桶' });
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to move task to trash:', error);
    toast({
      title: '删除失败',
      description: '无法删除任务，请稍后再试',
      variant: 'destructive',
    });
    return false;
  }
}

export async function restoreFromTrash(id: string): Promise<boolean> {
  try {
    const storage = await ensureStorage();
    const result = await storage.updateTask(id, {
      deleted: false,
      deleted_at: undefined,
    });
    if (result) {
      toast({ title: '恢复成功', description: '任务已恢复' });
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to restore task from trash:', error);
    toast({
      title: '恢复失败',
      description: '无法恢复任务，请稍后再试',
      variant: 'destructive',
    });
    return false;
  }
}

export async function abandonTask(id: string): Promise<boolean> {
  try {
    const storage = await ensureStorage();
    const result = await storage.updateTask(id, {
      abandoned: true,
      abandoned_at: new Date().toISOString(),
      completed: false,
      completed_at: undefined,
    });
    if (result) {
      toast({ title: '任务已放弃', description: '任务已标记为放弃' });
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to abandon task:', error);
    toast({
      title: '放弃失败',
      description: '无法放弃任务，请稍后再试',
      variant: 'destructive',
    });
    return false;
  }
}

export async function restoreAbandonedTask(id: string): Promise<boolean> {
  try {
    const storage = await ensureStorage();
    const result = await storage.updateTask(id, {
      abandoned: false,
      abandoned_at: undefined,
    });
    if (result) {
      toast({ title: '任务已恢复', description: '任务已从放弃状态恢复' });
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to restore abandoned task:', error);
    toast({
      title: '恢复失败',
      description: '无法恢复任务，请稍后再试',
      variant: 'destructive',
    });
    return false;
  }
}

export async function batchUpdateSortOrder(
  updates: Array<{ id: string; sort_order: number }>
): Promise<boolean> {
  try {
    const storage = await ensureStorage();
    return await storage.batchUpdateSortOrder(updates);
  } catch (error) {
    console.error('Failed to batch update sort order:', error);
    return false;
  }
}

// ============================================
// Tag Operations
// ============================================

export async function fetchAllTags(projectId?: string | null): Promise<Tag[]> {
  try {
    const storage = await ensureStorage();
    return await storage.getTags(projectId);
  } catch (error) {
    console.error('Failed to fetch tags:', error);
    return [];
  }
}

export async function createTag(name: string, projectId?: string | null): Promise<Tag | null> {
  try {
    const storage = await ensureStorage();
    return await storage.createTag(name, projectId);
  } catch (error) {
    console.error('Failed to create tag:', error);
    toast({
      title: '创建失败',
      description: '无法创建标签',
      variant: 'destructive',
    });
    return null;
  }
}

export async function deleteTagById(tagId: string): Promise<boolean> {
  try {
    const storage = await ensureStorage();
    return await storage.deleteTag(tagId);
  } catch (error) {
    console.error('Failed to delete tag:', error);
    toast({
      title: '删除失败',
      description: '无法删除标签',
      variant: 'destructive',
    });
    return false;
  }
}

export async function getTagsByTaskIds(taskIds: string[]): Promise<Record<string, Tag[]>> {
  try {
    const storage = await ensureStorage();
    return await storage.getTagsByTaskIds(taskIds);
  } catch (error) {
    console.error('Failed to get tags by task ids:', error);
    return {};
  }
}

export async function attachTagToTask(taskId: string, tagId: string): Promise<boolean> {
  try {
    const storage = await ensureStorage();
    await storage.attachTagToTask(taskId, tagId);
    return true;
  } catch (error) {
    console.error('Failed to attach tag to task:', error);
    toast({
      title: '关联失败',
      description: '无法给任务添加标签',
      variant: 'destructive',
    });
    return false;
  }
}

export async function detachTagFromTask(taskId: string, tagId: string): Promise<boolean> {
  try {
    const storage = await ensureStorage();
    await storage.detachTagFromTask(taskId, tagId);
    return true;
  } catch (error) {
    console.error('Failed to detach tag from task:', error);
    toast({
      title: '移除失败',
      description: '无法从任务移除标签',
      variant: 'destructive',
    });
    return false;
  }
}

export async function updateTag(tagId: string, updates: Partial<Tag>): Promise<Tag | null> {
  try {
    const storage = await ensureStorage();
    return await storage.updateTag(tagId, updates);
  } catch (error) {
    console.error('Failed to update tag:', error);
    toast({
      title: '更新失败',
      description: '无法更新标签',
      variant: 'destructive',
    });
    return null;
  }
}

export async function updateTagProject(tagId: string, projectId: string | null): Promise<Tag | null> {
  try {
    const storage = await ensureStorage();
    const result = await storage.updateTag(tagId, { project_id: projectId });
    if (result) {
      if (projectId === null) {
        toast({ title: '已更新', description: '标签已设为全局可见' });
      } else {
        toast({ title: '已更新', description: '已更新标签可见范围' });
      }
    }
    return result;
  } catch (error) {
    console.error('Failed to update tag project:', error);
    toast({
      title: '更新失败',
      description: '无法更新标签所属项目',
      variant: 'destructive',
    });
    return null;
  }
}

// ============================================
// Project Operations
// ============================================

export async function getProjects(): Promise<Project[]> {
  try {
    const storage = await ensureStorage();
    return await storage.getProjects();
  } catch (error) {
    console.error('Failed to get projects:', error);
    return [];
  }
}

export async function createProject(project: Omit<Project, 'id' | 'count'>): Promise<Project | null> {
  try {
    const storage = await ensureStorage();
    const result = await storage.createProject(project);
    toast({ title: '清单已创建', description: '新清单已成功创建' });
    return result;
  } catch (error) {
    console.error('Failed to create project:', error);
    toast({
      title: '创建失败',
      description: '无法创建新清单，请稍后再试',
      variant: 'destructive',
    });
    return null;
  }
}

export async function updateProject(id: string, updates: Partial<Project>): Promise<Project | null> {
  try {
    const storage = await ensureStorage();
    const result = await storage.updateProject(id, updates);
    if (result) {
      toast({ title: '清单已更新', description: '清单修改已保存' });
    }
    return result;
  } catch (error) {
    console.error('Failed to update project:', error);
    toast({
      title: '更新失败',
      description: '无法保存清单修改，请稍后再试',
      variant: 'destructive',
    });
    return null;
  }
}

export async function deleteProject(id: string): Promise<boolean> {
  try {
    const storage = await ensureStorage();
    const result = await storage.deleteProject(id);
    if (result) {
      toast({ title: '清单已删除', description: '清单已被成功删除' });
    }
    return result;
  } catch (error) {
    console.error('Failed to delete project:', error);
    toast({
      title: '删除失败',
      description: '无法删除清单，请稍后再试',
      variant: 'destructive',
    });
    return false;
  }
}

export async function batchUpdateProjectSortOrder(
  updates: Array<{ id: string; sort_order: number }>
): Promise<boolean> {
  try {
    const storage = await ensureStorage();
    return await storage.batchUpdateProjectSortOrder(updates);
  } catch (error) {
    console.error('Failed to batch update project sort order:', error);
    return false;
  }
}

// ============================================
// Pomodoro Operations
// ============================================

export type PomodoroSessionType = 'focus' | 'short_break' | 'long_break';

export interface PomodoroSessionPublic {
  id: string;
  user_id?: string;
  start_time: string;
  end_time: string | null;
  duration: number;
  type: PomodoroSessionType;
  completed: boolean;
  created_at: string;
  title?: string | null;
}

export interface FetchPomodoroSessionsOptions {
  from?: string;
  to?: string;
  limit?: number;
  order?: 'asc' | 'desc';
  types?: PomodoroSessionType[];
  completed?: boolean;
}

export interface PomodoroTodayStats {
  focusCount: number;
  focusMinutes: number;
  breakCount: number;
  breakMinutes: number;
  sessions: PomodoroSessionPublic[];
}

const mapInternalTypeToPublic = (type: PomodoroSession['type']): PomodoroSessionType => {
  if (type === 'work') return 'focus';
  return type;
};

const mapPublicTypeToInternal = (type: PomodoroSessionType): PomodoroSession['type'] => {
  if (type === 'focus') return 'work';
  return type;
};

const mapSessionToPublic = (session: PomodoroSession): PomodoroSessionPublic => ({
  id: session.id,
  user_id: session.user_id,
  start_time: session.started_at,
  end_time: session.completed_at ?? null,
  duration: session.duration,
  type: mapInternalTypeToPublic(session.type),
  completed: !!session.completed_at,
  created_at: session.created_at,
  title: session.title ?? null,
});

const calculateActualMinutes = (session: PomodoroSessionPublic): number => {
  if (!session.end_time) {
    return session.duration ?? 0;
  }
  const start = new Date(session.start_time).getTime();
  const end = new Date(session.end_time).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) {
    return session.duration ?? 0;
  }
  const diffMinutes = Math.max(0, Math.round((end - start) / 60000));
  if (diffMinutes === 0) {
    return session.duration ?? 0;
  }
  return diffMinutes;
};

export async function getPomodoroSessions(taskId?: string): Promise<PomodoroSession[]> {
  try {
    const storage = await ensureStorage();
    return await storage.getPomodoroSessions(taskId);
  } catch (error) {
    console.error('Failed to get pomodoro sessions:', error);
    return [];
  }
}

export async function startPomodoroSession(
  sessionType: PomodoroSessionType,
  durationMinutes: number,
  title?: string
): Promise<PomodoroSessionPublic | null> {
  try {
    const storage = await ensureStorage();
    const session = await storage.createPomodoroSession({
      type: mapPublicTypeToInternal(sessionType),
      duration: durationMinutes,
      started_at: new Date().toISOString(),
      title: title?.trim() || null,
    });
    return mapSessionToPublic(session);
  } catch (error) {
    console.error('Failed to start pomodoro session:', error);
    toast({
      title: '操作失败',
      description: '无法启动番茄钟，请稍后重试。',
      variant: 'destructive',
    });
    return null;
  }
}

export async function completePomodoroSession(
  id: string,
  options: { completed?: boolean; endTime?: string; durationOverride?: number } = {}
): Promise<boolean> {
  try {
    const storage = await ensureStorage();
    const { completed = true, endTime, durationOverride } = options;
    const updates: Partial<PomodoroSession> = {
      completed_at: completed ? (endTime ?? new Date().toISOString()) : undefined,
    };
    if (typeof durationOverride === 'number') {
      updates.duration = durationOverride;
    }
    const result = await storage.updatePomodoroSession(id, updates);
    return !!result;
  } catch (error) {
    console.error('Failed to complete pomodoro session:', error);
    toast({
      title: '操作失败',
      description: '无法完成番茄钟，请稍后重试。',
      variant: 'destructive',
    });
    return false;
  }
}

export async function cancelPomodoroSession(id: string): Promise<boolean> {
  return completePomodoroSession(id, { completed: false });
}

export async function getActivePomodoroSession(): Promise<PomodoroSessionPublic | null> {
  try {
    const storage = await ensureStorage();
    const sessions = await storage.getPomodoroSessions();
    const active = sessions
      .filter(s => !s.completed_at)
      .sort((a, b) => b.started_at.localeCompare(a.started_at))[0];
    return active ? mapSessionToPublic(active) : null;
  } catch (error) {
    console.error('Failed to get active pomodoro session:', error);
    return null;
  }
}

export async function fetchPomodoroSessions(
  options: FetchPomodoroSessionsOptions = {}
): Promise<PomodoroSessionPublic[]> {
  try {
    const storage = await ensureStorage();
    let sessions = await storage.getPomodoroSessions();

    if (options.from) {
      sessions = sessions.filter(s => s.started_at >= options.from!);
    }
    if (options.to) {
      sessions = sessions.filter(s => s.started_at <= options.to!);
    }
    if (options.types && options.types.length > 0) {
      const internalTypes = options.types.map(mapPublicTypeToInternal);
      sessions = sessions.filter(s => internalTypes.includes(s.type));
    }
    if (typeof options.completed === 'boolean') {
      sessions = sessions.filter(s => !!s.completed_at === options.completed);
    }

    sessions.sort((a, b) => {
      const cmp = a.started_at.localeCompare(b.started_at);
      return options.order === 'asc' ? cmp : -cmp;
    });

    if (options.limit) {
      sessions = sessions.slice(0, options.limit);
    }

    return sessions.map(mapSessionToPublic);
  } catch (error) {
    console.error('Failed to fetch pomodoro sessions:', error);
    toast({
      title: '操作失败',
      description: '无法获取番茄钟记录，请稍后重试。',
      variant: 'destructive',
    });
    return [];
  }
}

export async function getPomodoroTodayStats(): Promise<PomodoroTodayStats | null> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const sessions = await fetchPomodoroSessions({
    from: startOfDay.toISOString(),
    order: 'asc',
  });

  if (!sessions.length) {
    return {
      focusCount: 0,
      focusMinutes: 0,
      breakCount: 0,
      breakMinutes: 0,
      sessions: [],
    };
  }

  let focusCount = 0;
  let focusMinutes = 0;
  let breakCount = 0;
  let breakMinutes = 0;

  sessions.forEach((session) => {
    if (!session.completed) return;
    const actualMinutes = calculateActualMinutes(session);

    if (session.type === 'focus') {
      focusCount += 1;
      focusMinutes += actualMinutes;
    } else {
      breakCount += 1;
      breakMinutes += actualMinutes;
    }
  });

  return {
    focusCount,
    focusMinutes,
    breakCount,
    breakMinutes,
    sessions,
  };
}

export async function createPomodoroSession(session: CreatePomodoroInput): Promise<PomodoroSession | null> {
  try {
    const storage = await ensureStorage();
    return await storage.createPomodoroSession(session);
  } catch (error) {
    console.error('Failed to create pomodoro session:', error);
    return null;
  }
}

export async function updatePomodoroSession(
  id: string,
  updates: Partial<PomodoroSession>
): Promise<PomodoroSession | null> {
  try {
    const storage = await ensureStorage();
    return await storage.updatePomodoroSession(id, updates);
  } catch (error) {
    console.error('Failed to update pomodoro session:', error);
    return null;
  }
}

export async function deletePomodoroSession(id: string): Promise<boolean> {
  try {
    const storage = await ensureStorage();
    return await storage.deletePomodoroSession(id);
  } catch (error) {
    console.error('Failed to delete pomodoro session:', error);
    return false;
  }
}

// ============================================
// Task Activity Operations
// ============================================

export async function getTaskActivities(taskId: string): Promise<TaskActivity[]> {
  try {
    const storage = await ensureStorage();
    return await storage.getTaskActivities(taskId);
  } catch (error) {
    console.error('Failed to get task activities:', error);
    return [];
  }
}

export async function createTaskActivity(activity: CreateActivityInput): Promise<TaskActivity | null> {
  try {
    const storage = await ensureStorage();
    return await storage.createTaskActivity(activity);
  } catch (error) {
    console.error('Failed to create task activity:', error);
    return null;
  }
}

// ============================================
// Check-In Operations
// ============================================

export async function hasCheckedInToday(): Promise<boolean> {
  try {
    const storage = await ensureStorage();
    return await storage.hasCheckedInToday();
  } catch (error) {
    console.error('Failed to check if checked in today:', error);
    return false;
  }
}

export async function createCheckIn(note?: string): Promise<CheckInRecord | null> {
  try {
    const storage = await ensureStorage();
    return await storage.createCheckIn(note);
  } catch (error) {
    console.error('Failed to create check-in:', error);
    toast({
      title: '打卡失败',
      description: '无法完成打卡，请稍后再试',
      variant: 'destructive',
    });
    return null;
  }
}

export async function getCheckInHistory(
  page?: number,
  pageSize?: number
): Promise<{ records: CheckInRecord[]; total: number }> {
  try {
    const storage = await ensureStorage();
    return await storage.getCheckInHistory(page, pageSize);
  } catch (error) {
    console.error('Failed to get check-in history:', error);
    return { records: [], total: 0 };
  }
}

export async function getCheckInStreak(): Promise<number> {
  try {
    const storage = await ensureStorage();
    return await storage.getCheckInStreak();
  } catch (error) {
    console.error('Failed to get check-in streak:', error);
    return 0;
  }
}

// ============================================
// File Storage Operations
// ============================================

import { FileUploadResult, SearchOptions, SearchResult, UserSettings, UserProfile, AppInfo } from './types';

export async function uploadAttachment(taskId: string, file: File): Promise<FileUploadResult | null> {
  try {
    const storage = await ensureStorage();
    return await storage.uploadAttachment(taskId, file);
  } catch (error) {
    console.error('Failed to upload attachment:', error);
    toast({
      title: '上传失败',
      description: '无法上传附件，请稍后再试',
      variant: 'destructive',
    });
    return null;
  }
}

export async function deleteAttachment(attachmentId: string): Promise<boolean> {
  try {
    const storage = await ensureStorage();
    return await storage.deleteAttachment(attachmentId);
  } catch (error) {
    console.error('Failed to delete attachment:', error);
    toast({
      title: '删除失败',
      description: '无法删除附件，请稍后再试',
      variant: 'destructive',
    });
    return false;
  }
}

export async function uploadImage(file: File): Promise<FileUploadResult | null> {
  try {
    const storage = await ensureStorage();
    return await storage.uploadImage(file);
  } catch (error) {
    console.error('Failed to upload image:', error);
    toast({
      title: '上传失败',
      description: '无法上传图片，请稍后再试',
      variant: 'destructive',
    });
    return null;
  }
}

export async function uploadAvatar(file: File): Promise<FileUploadResult | null> {
  try {
    const storage = await ensureStorage();
    return await storage.uploadAvatar(file);
  } catch (error) {
    console.error('Failed to upload avatar:', error);
    toast({
      title: '上传失败',
      description: '无法上传头像，请稍后再试',
      variant: 'destructive',
    });
    return null;
  }
}

// ============================================
// Search Operations
// ============================================

export async function searchTasks(query: string, options?: SearchOptions): Promise<SearchResult> {
  try {
    const storage = await ensureStorage();
    return await storage.searchTasks(query, options);
  } catch (error) {
    console.error('Failed to search tasks:', error);
    return { tasks: [], totalCount: 0, searchTime: 0 };
  }
}

// ============================================
// User Settings Operations
// ============================================

export async function getUserSettings(): Promise<UserSettings> {
  try {
    const storage = await ensureStorage();
    return await storage.getUserSettings();
  } catch (error) {
    console.error('Failed to get user settings:', error);
    return {};
  }
}

export async function saveUserSettings(settings: Partial<UserSettings>): Promise<UserSettings | null> {
  try {
    const storage = await ensureStorage();
    const result = await storage.saveUserSettings(settings);
    toast({
      title: '设置已保存',
      description: '您的设置已成功保存',
    });
    return result;
  } catch (error) {
    console.error('Failed to save user settings:', error);
    toast({
      title: '保存失败',
      description: '无法保存设置，请稍后再试',
      variant: 'destructive',
    });
    return null;
  }
}

// ============================================
// User Profile Operations
// ============================================

export async function getUserProfile(): Promise<UserProfile | null> {
  try {
    const storage = await ensureStorage();
    return await storage.getUserProfile();
  } catch (error) {
    console.error('Failed to get user profile:', error);
    return null;
  }
}

export async function saveUserProfile(profile: Partial<UserProfile>): Promise<UserProfile | null> {
  try {
    const storage = await ensureStorage();
    const result = await storage.saveUserProfile(profile);
    toast({
      title: '资料已更新',
      description: '您的个人资料已成功保存',
    });
    return result;
  } catch (error) {
    console.error('Failed to save user profile:', error);
    toast({
      title: '保存失败',
      description: '无法保存个人资料，请稍后再试',
      variant: 'destructive',
    });
    return null;
  }
}

// ============================================
// App Info Operations
// ============================================

export async function getAppInfo(): Promise<AppInfo> {
  try {
    const storage = await ensureStorage();
    return await storage.getAppInfo();
  } catch (error) {
    console.error('Failed to get app info:', error);
    return {
      version: '1.0.0',
      announcement: undefined,
      maintenance_mode: false,
    };
  }
}
