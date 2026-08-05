/** Internal Supabase datasource retained while repositories absorb legacy query modules. */

import { supabase } from './client';
import { Task } from '@/types/task';
import { Project } from '@/types/project';
import {
  TaskFilter,
  TaskActivity,
  CreateTaskInput,
  CreateProjectInput,
  CreateActivityInput,
  FileUploadResult,
  SearchOptions,
  SearchResult,
  UserSettings,
  UserProfile,
  AppInfo,
} from './legacyTypes';
import * as taskService from './legacy/taskService';
import * as taskActivityService from './legacy/taskActivityService';

export class SupabaseAdapter {
  private userId: string | null = null;

  private async ensureUser(): Promise<string> {
    if (!this.userId) {
      const { data } = await supabase.auth.getUser();
      this.userId = data?.user?.id ?? null;
    }
    if (!this.userId) {
      throw new Error('User not authenticated');
    }
    return this.userId;
  }

  // ============================================
  // Task Operations
  // ============================================

  async getTasks(filter?: TaskFilter): Promise<Task[]> {
    const includeDeleted = filter?.deleted === true;
    
    if (filter?.deleted === true && filter?.abandoned !== true) {
      return taskService.fetchDeletedTasks(false);
    }
    
    if (filter?.abandoned === true) {
      return taskService.fetchAbandonedTasks(false);
    }
    
    const tasks = await taskService.fetchTasks(includeDeleted, false);
    
    let result = tasks;
    if (filter?.projectId !== undefined) {
      result = result.filter(t => t.project === filter.projectId);
    }
    if (filter?.completed !== undefined) {
      result = result.filter(t => t.completed === filter.completed);
    }
    if (filter?.flagged !== undefined) {
      result = result.filter(t => t.flagged === filter.flagged);
    }
    
    return result;
  }

  async getTaskById(id: string): Promise<Task | null> {
    const tasks = await taskService.fetchTasks(true, false);
    return tasks.find(t => t.id === id) ?? null;
  }

  async createTask(task: CreateTaskInput): Promise<Task> {
    const result = await taskService.addTask(task, false);
    if (!result) {
      throw new Error('Failed to create task');
    }
    return result;
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
    return taskService.updateTask(id, updates, false);
  }

  async deleteTask(id: string): Promise<boolean> {
    return taskService.deleteTask(id, false);
  }

  async batchUpdateSortOrder(updates: Array<{ id: string; sort_order: number }>): Promise<boolean> {
    return taskService.batchUpdateSortOrder(updates, false);
  }

  // ============================================
  // Project Operations
  // ============================================

  async getProjects(): Promise<Project[]> {
    await this.ensureUser();
    
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', this.userId!)
      .order('sort_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((p) => ({ ...p, count: 0 }));
  }

  async getProjectById(id: string): Promise<Project | null> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data ? { ...data, count: 0 } : null;
  }

  async createProject(project: CreateProjectInput): Promise<Project> {
    const userId = await this.ensureUser();

    const { data: maxOrderData } = await supabase
      .from('projects')
      .select('sort_order')
      .eq('user_id', userId)
      .order('sort_order', { ascending: false })
      .limit(1);

    const maxOrder =
      maxOrderData && maxOrderData.length > 0 && maxOrderData[0].sort_order !== null
        ? maxOrderData[0].sort_order
        : 0;
    const nextSortOrder = maxOrder + 1000;

    const { data, error } = await supabase
      .from('projects')
      .insert({
        name: project.name,
        icon: project.icon || 'folder',
        color: project.color || '#4CAF50',
        view_type: project.view_type || 'list',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: userId,
        sort_order: nextSortOrder,
      })
      .select()
      .single();

    if (error) throw error;
    return { ...data, count: 0 };
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | null> {
    const { data, error } = await supabase
      .from('projects')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw error;
    return data ? { ...data, count: 0 } : null;
  }

  async deleteProject(id: string): Promise<boolean> {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) throw error;
    return true;
  }

  async batchUpdateProjectSortOrder(
    updates: Array<{ id: string; sort_order: number }>
  ): Promise<boolean> {
    if (updates.length === 0) return true;

    const updatePromises = updates.map(({ id, sort_order }) =>
      supabase.from('projects').update({ sort_order }).eq('id', id)
    );

    const results = await Promise.all(updatePromises);
    const hasError = results.some((result) => result.error);
    if (hasError) throw new Error('Some updates failed');
    return true;
  }

  // ============================================
  // Activity Operations
  // ============================================

  async getTaskActivities(taskId: string): Promise<TaskActivity[]> {
    const activities = await taskActivityService.fetchTaskActivities(taskId);
    return activities.map(a => ({
      id: a.id,
      task_id: a.task_id,
      user_id: a.user_id,
      action: a.action,
      metadata: a.metadata as Record<string, unknown> | null,
      created_at: a.created_at,
    }));
  }

  async createTaskActivity(activity: CreateActivityInput): Promise<TaskActivity> {
    await taskActivityService.createTaskActivity(
      activity.task_id,
      activity.action as Parameters<typeof taskActivityService.createTaskActivity>[1],
      activity.metadata ?? undefined
    );
    
    const activities = await this.getTaskActivities(activity.task_id);
    const created = activities[0];
    if (!created) {
      throw new Error('Failed to create task activity');
    }
    return created;
  }

  // ============================================
  // File Storage Operations
  // ============================================

  async uploadAttachment(taskId: string, file: File): Promise<FileUploadResult> {
    const userId = await this.ensureUser();
    const fileExt = file.name.split('.').pop() || 'bin';
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 10)}.${fileExt}`;
    const filePath = `${userId}/${taskId}/${fileName}`;

    const { data, error } = await supabase.storage
      .from('task-attachments')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('task-attachments')
      .getPublicUrl(filePath);

    return {
      id: data.path,
      filename: fileName,
      original_name: file.name,
      url: urlData.publicUrl,
      size: file.size,
      type: file.type,
      uploaded_at: new Date().toISOString(),
    };
  }

  async deleteAttachment(attachmentId: string): Promise<boolean> {
    const { error } = await supabase.storage
      .from('task-attachments')
      .remove([attachmentId]);

    if (error) throw error;
    return true;
  }

  async uploadImage(file: File): Promise<FileUploadResult> {
    const userId = await this.ensureUser();
    const fileExt = file.name.split('.').pop() || 'png';
    const fileName = `paste_${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    const { data, error } = await supabase.storage
      .from('task-attachments')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('task-attachments')
      .getPublicUrl(filePath);

    return {
      id: data.path,
      filename: fileName,
      original_name: file.name,
      url: urlData.publicUrl,
      size: file.size,
      type: file.type,
      uploaded_at: new Date().toISOString(),
    };
  }

  async uploadAvatar(file: File): Promise<FileUploadResult> {
    const userId = await this.ensureUser();
    const fileExt = file.name.split('.').pop() || 'png';
    const fileName = `${userId}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    const { error } = await supabase.storage
      .from('user-avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('user-avatars')
      .getPublicUrl(filePath);

    return {
      id: filePath,
      filename: fileName,
      original_name: file.name,
      url: urlData.publicUrl,
      size: file.size,
      type: file.type,
      uploaded_at: new Date().toISOString(),
    };
  }

  // ============================================
  // Search Operations
  // ============================================

  async searchTasks(query: string, options?: SearchOptions): Promise<SearchResult> {
    const { searchTasksWithILike } = await import('./legacy/searchService');
    return searchTasksWithILike(query, options);
  }

  // ============================================
  // User Settings Operations
  // ============================================

  async getUserSettings(): Promise<UserSettings> {
    const { data } = await supabase.auth.getUser();
    const metadata = data?.user?.user_metadata || {};
    return {
      deadline_notification_enabled: metadata.deadline_notification_enabled,
      deadline_notification_days: metadata.deadline_notification_days,
      webhook_url: metadata.webhook_url,
      webhook_enabled: metadata.webhook_enabled,
    };
  }

  async saveUserSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
    const current = await this.getUserSettings();
    const merged = { ...current, ...settings };

    const { error } = await supabase.auth.updateUser({
      data: merged,
    });

    if (error) throw error;
    return merged;
  }

  // ============================================
  // User Profile Operations
  // ============================================

  async getUserProfile(): Promise<UserProfile | null> {
    const { data } = await supabase.auth.getUser();
    if (!data?.user) return null;

    const user = data.user;
    return {
      id: user.id,
      username: user.user_metadata?.name || user.email || '',
      avatar_url: user.user_metadata?.avatar_url || null,
      settings: {
        deadline_notification_enabled: user.user_metadata?.deadline_notification_enabled,
        deadline_notification_days: user.user_metadata?.deadline_notification_days,
        webhook_url: user.user_metadata?.webhook_url,
        webhook_enabled: user.user_metadata?.webhook_enabled,
      },
      updated_at: user.updated_at || new Date().toISOString(),
    };
  }

  async saveUserProfile(profile: Partial<UserProfile>): Promise<UserProfile> {
    const updateData: Record<string, unknown> = {};
    
    if (profile.username !== undefined) {
      updateData.name = profile.username;
    }
    if (profile.avatar_url !== undefined) {
      updateData.avatar_url = profile.avatar_url;
    }
    if (profile.settings !== undefined) {
      Object.assign(updateData, profile.settings);
    }

    const { error } = await supabase.auth.updateUser({
      data: updateData,
    });

    if (error) throw error;

    const updated = await this.getUserProfile();
    if (!updated) {
      throw new Error('Failed to get updated profile');
    }
    return updated;
  }

  // ============================================
  // App Info Operations
  // ============================================

  async getAppInfo(): Promise<AppInfo> {
    // app_info table may not exist in all deployments
    // Return default values for now
    return {
      version: '1.0.0',
      announcement: undefined,
      maintenance_mode: false,
    };
  }
}
