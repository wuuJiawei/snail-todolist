/**
 * Storage Operations Module
 * Provides unified task/tag/project operations that work in both online and offline modes
 * These functions are used by the application layer (contexts, components)
 */

import { Task } from '@/types/task';
import { Tag } from '@/types/tag';
import { Project } from '@/types/project';
import { getStorage, initializeStorage, isOfflineMode } from './index';
import * as taskService from '@/services/taskService';
import * as tagService from '@/services/tagService';
import { toast } from '@/hooks/use-toast';

// ============================================
// Task Operations
// ============================================

export async function addTask(task: Omit<Task, 'id'>): Promise<Task | null> {
  if (isOfflineMode) {
    try {
      await initializeStorage();
      const storage = getStorage();
      return await storage.createTask(task);
    } catch (error) {
      console.error('Failed to add task in offline mode:', error);
      toast({
        title: '添加失败',
        description: '无法添加任务，请稍后再试',
        variant: 'destructive',
      });
      return null;
    }
  }
  return taskService.addTask(task, false);
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
  if (isOfflineMode) {
    try {
      await initializeStorage();
      const storage = getStorage();
      return await storage.updateTask(id, updates);
    } catch (error) {
      console.error('Failed to update task in offline mode:', error);
      toast({
        title: '更新失败',
        description: '无法更新任务，请稍后再试',
        variant: 'destructive',
      });
      return null;
    }
  }
  return taskService.updateTask(id, updates, false);
}

export async function deleteTask(id: string): Promise<boolean> {
  if (isOfflineMode) {
    try {
      await initializeStorage();
      const storage = getStorage();
      return await storage.deleteTask(id);
    } catch (error) {
      console.error('Failed to delete task in offline mode:', error);
      toast({
        title: '删除失败',
        description: '无法删除任务，请稍后再试',
        variant: 'destructive',
      });
      return false;
    }
  }
  return taskService.deleteTask(id, false);
}

export async function moveToTrash(id: string): Promise<boolean> {
  if (isOfflineMode) {
    try {
      await initializeStorage();
      const storage = getStorage();
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
      console.error('Failed to move task to trash in offline mode:', error);
      toast({
        title: '删除失败',
        description: '无法删除任务，请稍后再试',
        variant: 'destructive',
      });
      return false;
    }
  }
  return taskService.moveToTrash(id, false);
}

export async function restoreFromTrash(id: string): Promise<boolean> {
  if (isOfflineMode) {
    try {
      await initializeStorage();
      const storage = getStorage();
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
      console.error('Failed to restore task from trash in offline mode:', error);
      toast({
        title: '恢复失败',
        description: '无法恢复任务，请稍后再试',
        variant: 'destructive',
      });
      return false;
    }
  }
  return taskService.restoreFromTrash(id, false);
}

export async function abandonTask(id: string): Promise<boolean> {
  if (isOfflineMode) {
    try {
      await initializeStorage();
      const storage = getStorage();
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
      console.error('Failed to abandon task in offline mode:', error);
      toast({
        title: '放弃失败',
        description: '无法放弃任务，请稍后再试',
        variant: 'destructive',
      });
      return false;
    }
  }
  return taskService.abandonTask(id, false);
}

export async function restoreAbandonedTask(id: string): Promise<boolean> {
  if (isOfflineMode) {
    try {
      await initializeStorage();
      const storage = getStorage();
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
      console.error('Failed to restore abandoned task in offline mode:', error);
      toast({
        title: '恢复失败',
        description: '无法恢复任务，请稍后再试',
        variant: 'destructive',
      });
      return false;
    }
  }
  return taskService.restoreAbandonedTask(id, false);
}

export async function batchUpdateSortOrder(
  updates: Array<{ id: string; sort_order: number }>
): Promise<boolean> {
  if (isOfflineMode) {
    try {
      await initializeStorage();
      const storage = getStorage();
      return await storage.batchUpdateSortOrder(updates);
    } catch (error) {
      console.error('Failed to batch update sort order in offline mode:', error);
      return false;
    }
  }
  return taskService.batchUpdateSortOrder(updates, false);
}

// ============================================
// Tag Operations
// ============================================

export async function fetchAllTags(projectId?: string | null): Promise<Tag[]> {
  if (isOfflineMode) {
    try {
      await initializeStorage();
      const storage = getStorage();
      return await storage.getTags(projectId);
    } catch (error) {
      console.error('Failed to fetch tags in offline mode:', error);
      return [];
    }
  }
  return tagService.fetchAllTags(projectId);
}

export async function createTag(name: string, projectId?: string | null): Promise<Tag | null> {
  if (isOfflineMode) {
    try {
      await initializeStorage();
      const storage = getStorage();
      return await storage.createTag(name, projectId);
    } catch (error) {
      console.error('Failed to create tag in offline mode:', error);
      toast({
        title: '创建失败',
        description: '无法创建标签',
        variant: 'destructive',
      });
      return null;
    }
  }
  return tagService.createTag(name, projectId);
}

export async function deleteTagById(tagId: string): Promise<boolean> {
  if (isOfflineMode) {
    try {
      await initializeStorage();
      const storage = getStorage();
      return await storage.deleteTag(tagId);
    } catch (error) {
      console.error('Failed to delete tag in offline mode:', error);
      toast({
        title: '删除失败',
        description: '无法删除标签',
        variant: 'destructive',
      });
      return false;
    }
  }
  return tagService.deleteTagById(tagId);
}

export async function getTagsByTaskIds(taskIds: string[]): Promise<Record<string, Tag[]>> {
  if (isOfflineMode) {
    try {
      await initializeStorage();
      const storage = getStorage();
      return await storage.getTagsByTaskIds(taskIds);
    } catch (error) {
      console.error('Failed to get tags by task ids in offline mode:', error);
      return {};
    }
  }
  return tagService.getTagsByTaskIds(taskIds);
}

export async function attachTagToTask(taskId: string, tagId: string): Promise<boolean> {
  if (isOfflineMode) {
    try {
      await initializeStorage();
      const storage = getStorage();
      await storage.attachTagToTask(taskId, tagId);
      return true;
    } catch (error) {
      console.error('Failed to attach tag to task in offline mode:', error);
      toast({
        title: '关联失败',
        description: '无法给任务添加标签',
        variant: 'destructive',
      });
      return false;
    }
  }
  return tagService.attachTagToTask(taskId, tagId);
}

export async function detachTagFromTask(taskId: string, tagId: string): Promise<boolean> {
  if (isOfflineMode) {
    try {
      await initializeStorage();
      const storage = getStorage();
      await storage.detachTagFromTask(taskId, tagId);
      return true;
    } catch (error) {
      console.error('Failed to detach tag from task in offline mode:', error);
      toast({
        title: '移除失败',
        description: '无法从任务移除标签',
        variant: 'destructive',
      });
      return false;
    }
  }
  return tagService.detachTagFromTask(taskId, tagId);
}

export async function updateTagProject(tagId: string, projectId: string | null): Promise<Tag | null> {
  if (isOfflineMode) {
    try {
      await initializeStorage();
      const storage = getStorage();
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
      console.error('Failed to update tag project in offline mode:', error);
      toast({
        title: '更新失败',
        description: '无法更新标签所属项目',
        variant: 'destructive',
      });
      return null;
    }
  }
  return tagService.updateTagProject(tagId, projectId);
}

// ============================================
// Project Operations
// ============================================

export async function getProjects(): Promise<Project[]> {
  if (isOfflineMode) {
    try {
      await initializeStorage();
      const storage = getStorage();
      return await storage.getProjects();
    } catch (error) {
      console.error('Failed to get projects in offline mode:', error);
      return [];
    }
  }
  // Online mode uses ProjectContext which handles Supabase directly
  throw new Error('getProjects should be called through ProjectContext in online mode');
}

export async function createProject(project: Omit<Project, 'id' | 'count'>): Promise<Project | null> {
  if (isOfflineMode) {
    try {
      await initializeStorage();
      const storage = getStorage();
      const result = await storage.createProject(project);
      toast({ title: '清单已创建', description: '新清单已成功创建' });
      return result;
    } catch (error) {
      console.error('Failed to create project in offline mode:', error);
      toast({
        title: '创建失败',
        description: '无法创建新清单，请稍后再试',
        variant: 'destructive',
      });
      return null;
    }
  }
  // Online mode uses ProjectContext
  throw new Error('createProject should be called through ProjectContext in online mode');
}

export async function updateProject(id: string, updates: Partial<Project>): Promise<Project | null> {
  if (isOfflineMode) {
    try {
      await initializeStorage();
      const storage = getStorage();
      const result = await storage.updateProject(id, updates);
      if (result) {
        toast({ title: '清单已更新', description: '清单修改已保存' });
      }
      return result;
    } catch (error) {
      console.error('Failed to update project in offline mode:', error);
      toast({
        title: '更新失败',
        description: '无法保存清单修改，请稍后再试',
        variant: 'destructive',
      });
      return null;
    }
  }
  // Online mode uses ProjectContext
  throw new Error('updateProject should be called through ProjectContext in online mode');
}

export async function deleteProject(id: string): Promise<boolean> {
  if (isOfflineMode) {
    try {
      await initializeStorage();
      const storage = getStorage();
      const result = await storage.deleteProject(id);
      if (result) {
        toast({ title: '清单已删除', description: '清单已被成功删除' });
      }
      return result;
    } catch (error) {
      console.error('Failed to delete project in offline mode:', error);
      toast({
        title: '删除失败',
        description: '无法删除清单，请稍后再试',
        variant: 'destructive',
      });
      return false;
    }
  }
  // Online mode uses ProjectContext
  throw new Error('deleteProject should be called through ProjectContext in online mode');
}
