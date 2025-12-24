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
import { getStorage, initializeStorage } from './index';
import { toast } from '@/hooks/use-toast';

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

export async function getPomodoroSessions(taskId?: string): Promise<PomodoroSession[]> {
  try {
    const storage = await ensureStorage();
    return await storage.getPomodoroSessions(taskId);
  } catch (error) {
    console.error('Failed to get pomodoro sessions:', error);
    return [];
  }
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
