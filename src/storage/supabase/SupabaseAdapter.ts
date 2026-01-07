/**
 * Supabase Storage Adapter
 * Delegates to existing service functions to implement StorageAdapter interface
 * Used in online mode for cloud-based storage
 * 
 * Note: This adapter wraps existing services rather than reimplementing Supabase calls
 * to maintain backward compatibility and avoid duplicating complex permission logic.
 */

import { supabase } from '@/integrations/supabase/client';
import { Task } from '@/types/task';
import { Project } from '@/types/project';
import { Tag } from '@/types/tag';
import {
  StorageAdapter,
  TaskFilter,
  SortOptions,
  PomodoroSession,
  TaskActivity,
  CreateTaskInput,
  CreateProjectInput,
  CreatePomodoroInput,
  CreateActivityInput,
  FileUploadResult,
  SearchOptions,
  SearchResult,
  UserSettings,
  UserProfile,
  AppInfo,
} from '../types';
import * as taskService from '@/services/taskService';
import * as tagService from '@/services/tagService';
import * as pomodoroService from '@/services/pomodoroService';
import * as taskActivityService from '@/services/taskActivityService';

export class SupabaseAdapter implements StorageAdapter {
  private ready = false;
  private userId: string | null = null;

  async initialize(): Promise<void> {
    const { data } = await supabase.auth.getUser();
    this.userId = data?.user?.id ?? null;
    this.ready = true;
  }

  isReady(): boolean {
    return this.ready;
  }

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

  async getTasks(filter?: TaskFilter, _sort?: SortOptions[]): Promise<Task[]> {
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
  // Tag Operations (delegate to tagService)
  // ============================================

  async getTags(projectId?: string | null): Promise<Tag[]> {
    return tagService.fetchAllTags(projectId);
  }

  async getTagById(id: string): Promise<Tag | null> {
    const tags = await tagService.fetchAllTags();
    return tags.find(t => t.id === id) ?? null;
  }

  async createTag(name: string, projectId?: string | null): Promise<Tag> {
    const result = await tagService.createTag(name, projectId);
    if (!result) {
      throw new Error('Failed to create tag');
    }
    return result;
  }

  async updateTag(id: string, updates: Partial<Tag>): Promise<Tag | null> {
    if (updates.name) {
      return tagService.renameTag(id, updates.name);
    }
    if (updates.project_id !== undefined) {
      return tagService.updateTagProject(id, updates.project_id ?? null);
    }
    return null;
  }

  async deleteTag(id: string): Promise<boolean> {
    return tagService.deleteTagById(id);
  }

  // ============================================
  // Task-Tag Operations (delegate to tagService)
  // ============================================

  async getTagsByTaskIds(taskIds: string[]): Promise<Record<string, Tag[]>> {
    return tagService.getTagsByTaskIds(taskIds);
  }

  async attachTagToTask(taskId: string, tagId: string): Promise<void> {
    await tagService.attachTagToTask(taskId, tagId);
  }

  async detachTagFromTask(taskId: string, tagId: string): Promise<void> {
    await tagService.detachTagFromTask(taskId, tagId);
  }

  // ============================================
  // Pomodoro Operations
  // ============================================

  async getPomodoroSessions(taskId?: string): Promise<PomodoroSession[]> {
    const sessions = await pomodoroService.fetchPomodoroSessions({});
    
    const mapped = sessions.map(s => ({
      id: s.id,
      task_id: null as string | null,
      user_id: s.user_id,
      duration: s.duration,
      type: this.mapPomodoroType(s.type),
      started_at: s.start_time,
      completed_at: s.end_time,
      created_at: s.created_at,
      notes: null as string | null,
      title: s.title ?? null,
    }));
    
    if (taskId) {
      return mapped.filter(s => s.task_id === taskId);
    }
    return mapped;
  }

  private mapPomodoroType(type: pomodoroService.PomodoroSessionType): 'work' | 'short_break' | 'long_break' {
    if (type === 'focus') return 'work';
    if (type === 'short_break') return 'short_break';
    if (type === 'long_break') return 'long_break';
    return 'work';
  }

  async getPomodoroSessionById(id: string): Promise<PomodoroSession | null> {
    const sessions = await this.getPomodoroSessions();
    return sessions.find(s => s.id === id) ?? null;
  }

  async createPomodoroSession(session: CreatePomodoroInput): Promise<PomodoroSession> {
    const type = session.type === 'work' ? 'focus' : session.type;
    const result = await pomodoroService.startPomodoroSession(type, session.duration, session.title ?? undefined);
    
    if (!result) {
      throw new Error('Failed to create pomodoro session');
    }
    
    return {
      id: result.id,
      task_id: session.task_id ?? null,
      user_id: result.user_id,
      duration: result.duration,
      type: this.mapPomodoroType(result.type),
      started_at: result.start_time,
      completed_at: result.end_time,
      created_at: result.created_at,
      notes: null,
      title: result.title ?? null,
    };
  }

  async updatePomodoroSession(
    id: string,
    updates: Partial<PomodoroSession>
  ): Promise<PomodoroSession | null> {
    if (updates.completed_at) {
      await pomodoroService.completePomodoroSession(id, {
        completed: true,
        endTime: updates.completed_at,
        durationOverride: updates.duration,
      });
    }
    return this.getPomodoroSessionById(id);
  }

  async deletePomodoroSession(id: string): Promise<boolean> {
    return pomodoroService.deletePomodoroSession(id);
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
  // Check-In Operations (delegate to checkInService)
  // ============================================

  async hasCheckedInToday(): Promise<boolean> {
    // Import dynamically to avoid circular dependencies
    const { hasCheckedInToday } = await import('@/services/checkInService');
    return hasCheckedInToday();
  }

  async createCheckIn(note?: string): Promise<{ id: string; check_in_time: string; note?: string | null; created_at: string }> {
    const { createCheckIn } = await import('@/services/checkInService');
    const success = await createCheckIn(note);
    if (!success) {
      throw new Error('Failed to create check-in');
    }
    // Return a mock record since the service doesn't return the created record
    return {
      id: crypto.randomUUID(),
      check_in_time: new Date().toISOString(),
      note: note || null,
      created_at: new Date().toISOString(),
    };
  }

  async getCheckInHistory(page?: number, pageSize?: number): Promise<{ records: Array<{ id: string; check_in_time: string; note?: string | null; created_at: string }>; total: number }> {
    const { getCheckInHistory } = await import('@/services/checkInService');
    const result = await getCheckInHistory(page, pageSize);
    return {
      records: result.records.map(r => ({
        id: r.id || crypto.randomUUID(),
        check_in_time: r.check_in_time || new Date().toISOString(),
        note: r.note || null,
        created_at: r.created_at || new Date().toISOString(),
      })),
      total: result.total,
    };
  }

  async getCheckInStreak(): Promise<number> {
    const { getCheckInStreak } = await import('@/services/checkInService');
    return getCheckInStreak();
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
    const { searchTasksWithILike } = await import('@/services/searchService');
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
