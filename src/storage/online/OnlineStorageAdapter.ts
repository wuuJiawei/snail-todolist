/**
 * Online Storage Adapter
 * Implements StorageAdapter interface using custom backend API
 */

import { apiClient } from '@/lib/apiClient';
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
  CheckInRecord,
} from '../types';

interface ApiTask {
  id: string;
  title: string;
  description?: string;
  status: string;
  due_date?: string;
  list_id?: string;
  user_id: string;
  sort_order: number;
  completed: boolean;
  completed_at?: string;
  deleted: boolean;
  deleted_at?: string;
  abandoned: boolean;
  abandoned_at?: string;
  flagged: boolean;
  icon?: string;
  attachments?: TaskAttachment[];
  created_at: string;
  updated_at: string;
}

interface TaskAttachment {
  id: string;
  filename: string;
  original_name: string;
  url: string;
  size: number;
  type: string;
  uploaded_at: string;
}

interface ApiProject {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  view_type?: string;
  user_id: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface ApiTag {
  id: string;
  name: string;
  project_id?: string;
  user_id: string;
  created_at: string;
}

// 带标签的任务响应
interface ApiTaskWithTags extends ApiTask {
  tags?: ApiTag[];
}

interface ApiPomodoroSession {
  id: string;
  task_id?: string;
  user_id: string;
  duration: number;
  type: string;
  start_time: string;
  end_time?: string;
  completed: boolean;
  created_at: string;
}

interface ApiPomodoroSessionListResponse {
  sessions: ApiPomodoroSession[];
  total: number;
  page: number;
  limit: number;
}

interface ApiPomodoroTodayStats {
  total_sessions: number;
  completed_sessions: number;
  total_minutes: number;
  focus_minutes: number;
}

interface ApiTaskActivity {
  id: string;
  task_id: string;
  user_id: string;
  action: string;
  old_value?: string;
  new_value?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

interface ApiUserProfile {
  id: string;
  email: string;
  username?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

function mapApiTaskToTask(api: ApiTask): Task {
  return {
    id: api.id,
    title: api.title,
    description: api.description || '',
    completed: api.completed,
    completed_at: api.completed_at,
    date: api.due_date,
    project: api.list_id,
    icon: api.icon,
    updated_at: api.updated_at,
    user_id: api.user_id,
    sort_order: api.sort_order,
    deleted: api.deleted,
    deleted_at: api.deleted_at,
    abandoned: api.abandoned,
    abandoned_at: api.abandoned_at,
    flagged: api.flagged,
    attachments: api.attachments,
  };
}

function mapTaskToApiTask(task: Partial<Task>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (task.title !== undefined) result.title = task.title;
  if (task.description !== undefined) result.description = task.description;
  if (task.completed !== undefined) result.completed = task.completed;
  if (task.completed_at !== undefined) result.completed_at = task.completed_at;
  if (task.date !== undefined) result.due_date = task.date;
  if (task.project !== undefined) result.list_id = task.project;
  if (task.icon !== undefined) result.icon = task.icon;
  if (task.sort_order !== undefined) result.sort_order = task.sort_order;
  if (task.flagged !== undefined) result.flagged = task.flagged;
  if (task.abandoned !== undefined) result.abandoned = task.abandoned;
  if (task.abandoned_at !== undefined) result.abandoned_at = task.abandoned_at;
  if (task.deleted !== undefined) result.deleted = task.deleted;
  if (task.deleted_at !== undefined) result.deleted_at = task.deleted_at;
  return result;
}

function mapApiProjectToProject(api: ApiProject): Project {
  return {
    id: api.id,
    name: api.name,
    icon: api.icon || 'folder',
    color: api.color || '#4CAF50',
    view_type: (api.view_type as 'list' | 'board') || 'list',
    user_id: api.user_id,
    sort_order: api.sort_order,
    created_at: api.created_at,
    updated_at: api.updated_at,
    count: 0,
  };
}

function mapApiTagToTag(api: ApiTag): Tag {
  return {
    id: api.id,
    name: api.name,
    project_id: api.project_id || null,
    user_id: api.user_id,
    created_at: api.created_at,
  };
}

export class OnlineStorageAdapter implements StorageAdapter {
  private ready = false;
  private taskTagsCache: Map<string, Tag[]> = new Map();

  async initialize(): Promise<void> {
    this.ready = apiClient.isAuthenticated();
  }

  isReady(): boolean {
    return this.ready;
  }

  // ============================================
  // Task Operations
  // ============================================

  async getTasks(filter?: TaskFilter, _sort?: SortOptions[]): Promise<Task[]> {
    if (filter?.deleted === true) {
      const data = await apiClient.get<ApiTask[]>('/trash');
      return data.map(mapApiTaskToTask);
    }

    if (filter?.abandoned === true) {
      const data = await apiClient.get<ApiTask[]>('/abandoned');
      return data.map(mapApiTaskToTask);
    }

    if (filter?.flagged === true) {
      const data = await apiClient.get<ApiTask[]>('/flagged');
      return data.map(mapApiTaskToTask);
    }

    if (filter?.projectId) {
      const data = await apiClient.get<ApiTask[]>(`/lists/${filter.projectId}/tasks`);
      let tasks = data.map(mapApiTaskToTask);
      if (filter.completed !== undefined) {
        tasks = tasks.filter(t => t.completed === filter.completed);
      }
      return tasks;
    }

    // 获取所有活跃任务（带标签）
    const data = await apiClient.get<ApiTaskWithTags[]>('/tasks');
    
    // 缓存标签映射
    this.taskTagsCache.clear();
    for (const item of data) {
      if (item.tags) {
        this.taskTagsCache.set(item.id, item.tags.map(mapApiTagToTag));
      } else {
        this.taskTagsCache.set(item.id, []);
      }
    }
    
    return data.map(mapApiTaskToTask);
  }

  async getTaskById(id: string): Promise<Task | null> {
    try {
      const data = await apiClient.get<ApiTask>(`/tasks/${id}`);
      return mapApiTaskToTask(data);
    } catch {
      return null;
    }
  }

  async createTask(task: CreateTaskInput): Promise<Task> {
    const listId = task.project || 'inbox';
    const body = {
      title: task.title,
      description: task.description || '',
      due_date: task.date,
      icon: task.icon,
    };
    const data = await apiClient.post<ApiTask>(`/lists/${listId}/tasks`, body);
    return mapApiTaskToTask(data);
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
    // Handle abandon/reactivate operations via dedicated endpoints
    if (updates.abandoned !== undefined) {
      if (updates.abandoned) {
        const data = await apiClient.post<ApiTask>(`/tasks/${id}/abandon`);
        return mapApiTaskToTask(data);
      } else {
        const data = await apiClient.post<ApiTask>(`/tasks/${id}/reactivate`);
        return mapApiTaskToTask(data);
      }
    }

    // Handle delete/restore operations via dedicated endpoints
    if (updates.deleted !== undefined) {
      if (updates.deleted) {
        // Soft delete (move to trash) - use DELETE endpoint
        await apiClient.delete(`/tasks/${id}`);
        // Fetch the updated task to return
        return this.getTaskById(id);
      } else {
        // Restore from trash
        const data = await apiClient.post<ApiTask>(`/tasks/${id}/restore`);
        return mapApiTaskToTask(data);
      }
    }

    // Handle completion status via status endpoint
    if (updates.completed !== undefined) {
      const status = updates.completed ? 'done' : 'todo';
      await apiClient.patch(`/tasks/${id}/status`, { status });
      // Continue with other updates if any
      const remainingUpdates = { ...updates };
      delete remainingUpdates.completed;
      delete remainingUpdates.completed_at;
      
      if (Object.keys(mapTaskToApiTask(remainingUpdates)).length > 0) {
        const body = mapTaskToApiTask(remainingUpdates);
        const data = await apiClient.put<ApiTask>(`/tasks/${id}`, body);
        return mapApiTaskToTask(data);
      }
      return this.getTaskById(id);
    }

    // Regular update for other fields
    const body = mapTaskToApiTask(updates);
    const data = await apiClient.put<ApiTask>(`/tasks/${id}`, body);
    return mapApiTaskToTask(data);
  }

  async deleteTask(id: string): Promise<boolean> {
    await apiClient.delete(`/tasks/${id}`);
    return true;
  }

  async batchUpdateSortOrder(updates: Array<{ id: string; sort_order: number }>): Promise<boolean> {
    for (const { id, sort_order } of updates) {
      await apiClient.patch(`/tasks/${id}/sort`, { sort_order });
    }
    return true;
  }

  // ============================================
  // Project Operations
  // ============================================

  async getProjects(): Promise<Project[]> {
    const data = await apiClient.get<ApiProject[]>('/lists');
    return data.map(mapApiProjectToProject);
  }

  async getProjectById(id: string): Promise<Project | null> {
    const projects = await this.getProjects();
    return projects.find(p => p.id === id) || null;
  }

  async createProject(project: CreateProjectInput): Promise<Project> {
    const body = {
      name: project.name,
      icon: project.icon || 'folder',
      color: project.color || '#4CAF50',
      view_type: project.view_type || 'list',
    };
    const data = await apiClient.post<ApiProject>('/lists', body);
    return mapApiProjectToProject(data);
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | null> {
    const data = await apiClient.put<ApiProject>(`/lists/${id}`, updates);
    return mapApiProjectToProject(data);
  }

  async deleteProject(id: string): Promise<boolean> {
    await apiClient.delete(`/lists/${id}`);
    return true;
  }

  async batchUpdateProjectSortOrder(updates: Array<{ id: string; sort_order: number }>): Promise<boolean> {
    for (const { id, sort_order } of updates) {
      await apiClient.patch(`/lists/${id}/sort`, { sort_order });
    }
    return true;
  }

  // ============================================
  // Tag Operations
  // ============================================

  async getTags(projectId?: string | null): Promise<Tag[]> {
    const url = projectId ? `/tags?project_id=${projectId}` : '/tags';
    const data = await apiClient.get<ApiTag[]>(url);
    return data.map(mapApiTagToTag);
  }

  async getTagById(id: string): Promise<Tag | null> {
    const tags = await this.getTags();
    return tags.find(t => t.id === id) || null;
  }

  async createTag(name: string, projectId?: string | null): Promise<Tag> {
    const body = { name, project_id: projectId };
    const data = await apiClient.post<ApiTag>('/tags', body);
    return mapApiTagToTag(data);
  }

  async updateTag(id: string, updates: Partial<Tag>): Promise<Tag | null> {
    const data = await apiClient.put<ApiTag>(`/tags/${id}`, updates);
    return mapApiTagToTag(data);
  }

  async deleteTag(id: string): Promise<boolean> {
    await apiClient.delete(`/tags/${id}`);
    return true;
  }

  // ============================================
  // Task-Tag Operations
  // ============================================

  async getTagsByTaskIds(taskIds: string[]): Promise<Record<string, Tag[]>> {
    const result: Record<string, Tag[]> = {};
    const uncachedIds: string[] = [];
    
    // 先从缓存获取
    for (const taskId of taskIds) {
      const cached = this.taskTagsCache.get(taskId);
      if (cached !== undefined) {
        result[taskId] = cached;
      } else {
        uncachedIds.push(taskId);
      }
    }
    
    // 对于未缓存的，从 API 获取
    for (const taskId of uncachedIds) {
      try {
        const data = await apiClient.get<ApiTag[]>(`/tasks/${taskId}/tags`);
        const tags = data.map(mapApiTagToTag);
        result[taskId] = tags;
        this.taskTagsCache.set(taskId, tags);
      } catch {
        result[taskId] = [];
      }
    }
    
    return result;
  }

  async attachTagToTask(taskId: string, tagId: string): Promise<void> {
    await apiClient.post(`/tasks/${taskId}/tags/${tagId}`);
    this.taskTagsCache.delete(taskId);
  }

  async detachTagFromTask(taskId: string, tagId: string): Promise<void> {
    await apiClient.delete(`/tasks/${taskId}/tags/${tagId}`);
    this.taskTagsCache.delete(taskId);
  }

  // ============================================
  // Pomodoro Operations
  // ============================================

  async getPomodoroSessions(
    _taskId?: string,
    options?: {
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<PomodoroSession[]> {
    const params = new URLSearchParams();
    
    if (options?.startDate) {
      params.set('start_date', options.startDate.slice(0, 10)); // YYYY-MM-DD
    }
    if (options?.endDate) {
      params.set('end_date', options.endDate.slice(0, 10)); // YYYY-MM-DD
    }
    if (options?.page) {
      params.set('page', String(options.page));
    }
    if (options?.limit) {
      params.set('limit', String(options.limit));
    }
    
    const queryString = params.toString();
    const url = queryString ? `/pomodoro/sessions?${queryString}` : '/pomodoro/sessions';
    
    const data = await apiClient.get<ApiPomodoroSessionListResponse>(url);
    
    // 如果返回的是列表响应格式，提取 sessions 数组
    const sessions = Array.isArray(data) ? data : data.sessions;
    
    return sessions.map(s => ({
      id: s.id,
      task_id: s.task_id || null,
      user_id: s.user_id,
      duration: s.duration,
      type: this.mapPomodoroType(s.type),
      started_at: s.start_time,
      completed_at: s.end_time || null,
      created_at: s.created_at,
      notes: null,
    }));
  }

  /**
   * 映射后端类型到内部类型
   * 后端使用: focus, short_break, long_break
   * 内部使用: work, short_break, long_break (为了兼容 IndexedDB)
   */
  private mapPomodoroType(type: string): 'work' | 'short_break' | 'long_break' {
    if (type === 'focus') return 'work';
    if (type === 'short_break') return 'short_break';
    if (type === 'long_break') return 'long_break';
    // 默认返回 work（兼容旧数据）
    return 'work';
  }

  /**
   * 映射内部类型到后端类型
   * 内部使用: work, short_break, long_break
   * 后端使用: focus, short_break, long_break
   */
  private mapPomodoroTypeToBackend(type: 'work' | 'short_break' | 'long_break'): string {
    if (type === 'work') return 'focus';
    return type;
  }

  async getPomodoroSessionById(id: string): Promise<PomodoroSession | null> {
    const sessions = await this.getPomodoroSessions();
    return sessions.find(s => s.id === id) || null;
  }

  /**
   * 获取当前用户的活跃会话
   * 直接调用后端 /pomodoro/sessions/active 接口
   */
  async getActivePomodoroSession(): Promise<PomodoroSession | null> {
    try {
      const data = await apiClient.get<ApiPomodoroSession>('/pomodoro/sessions/active');
      if (!data) {
        return null;
      }
      return {
        id: data.id,
        task_id: data.task_id || null,
        user_id: data.user_id,
        duration: data.duration,
        type: this.mapPomodoroType(data.type),
        started_at: data.start_time,
        completed_at: data.end_time || null,
        created_at: data.created_at,
        notes: null,
      };
    } catch (error) {
      // 如果没有活跃会话，后端返回 null，这不是错误
      return null;
    }
  }

  async createPomodoroSession(session: CreatePomodoroInput): Promise<PomodoroSession> {
    const body = {
      task_id: session.task_id,
      duration: session.duration,
      type: this.mapPomodoroTypeToBackend(session.type),
    };
    const data = await apiClient.post<ApiPomodoroSession>('/pomodoro/sessions', body);
    return {
      id: data.id,
      task_id: data.task_id || null,
      user_id: data.user_id,
      duration: data.duration,
      type: this.mapPomodoroType(data.type),
      started_at: data.start_time,
      completed_at: data.end_time || null,
      created_at: data.created_at,
      notes: null,
    };
  }

  async updatePomodoroSession(id: string, updates: Partial<PomodoroSession>): Promise<PomodoroSession | null> {
    try {
      // 判断是完成还是取消操作
      if (updates.completed_at !== undefined) {
        if (updates.completed_at) {
          // 完成会话
          await apiClient.patch(`/pomodoro/sessions/${id}/complete`);
        } else {
          // 取消会话
          await apiClient.patch(`/pomodoro/sessions/${id}/cancel`);
        }
      }
      
      // 重新获取会话数据以返回最新状态
      return this.getPomodoroSessionById(id);
    } catch (error) {
      console.error('Failed to update pomodoro session:', error);
      return null;
    }
  }

  async deletePomodoroSession(id: string): Promise<boolean> {
    await apiClient.delete(`/pomodoro/sessions/${id}`);
    return true;
  }

  /**
   * 获取今日番茄钟统计数据
   * 直接调用后端 /pomodoro/stats/today 接口
   */
  async getPomodoroTodayStats(): Promise<{
    totalSessions: number;
    completedSessions: number;
    totalMinutes: number;
    focusMinutes: number;
  } | null> {
    try {
      const data = await apiClient.get<ApiPomodoroTodayStats>('/pomodoro/stats/today');
      return {
        totalSessions: data.total_sessions,
        completedSessions: data.completed_sessions,
        totalMinutes: data.total_minutes,
        focusMinutes: data.focus_minutes,
      };
    } catch (error) {
      console.error('Failed to get today stats:', error);
      return null;
    }
  }

  // ============================================
  // Activity Operations
  // ============================================

  async getTaskActivities(taskId: string): Promise<TaskActivity[]> {
    const data = await apiClient.get<ApiTaskActivity[]>(`/tasks/${taskId}/activities`);
    return data.map(a => ({
      id: a.id,
      task_id: a.task_id,
      user_id: a.user_id,
      action: a.action,
      metadata: a.metadata || null,
      created_at: a.created_at,
    }));
  }

  async createTaskActivity(activity: CreateActivityInput): Promise<TaskActivity> {
    return {
      id: crypto.randomUUID(),
      task_id: activity.task_id,
      user_id: activity.user_id || '',
      action: activity.action,
      metadata: activity.metadata || null,
      created_at: new Date().toISOString(),
    };
  }

  // ============================================
  // Check-In Operations
  // ============================================

  async hasCheckedInToday(): Promise<boolean> {
    const response = await apiClient.get<{ checked_in: boolean }>('/checkin/today');
    return response.checked_in;
  }

  async createCheckIn(note?: string): Promise<CheckInRecord> {
    const response = await apiClient.post<CheckInRecord>('/checkin', { note });
    return response;
  }

  async getCheckInHistory(page = 1, pageSize = 365): Promise<{ records: CheckInRecord[]; total: number }> {
    const response = await apiClient.get<{ records: CheckInRecord[]; total: number }>(
      `/checkin/history?page=${page}&page_size=${pageSize}`
    );
    return response;
  }

  async getCheckInStreak(): Promise<number> {
    const response = await apiClient.get<{ streak: number }>('/checkin/streak');
    return response.streak;
  }

  // ============================================
  // File Storage Operations
  // ============================================

  async uploadAttachment(taskId: string, file: File): Promise<FileUploadResult> {
    return apiClient.upload<FileUploadResult>(`/tasks/${taskId}/attachments`, file);
  }

  async deleteAttachment(attachmentId: string): Promise<boolean> {
    const [taskId, attId] = attachmentId.split('/');
    if (taskId && attId) {
      await apiClient.delete(`/tasks/${taskId}/attachments/${attId}`);
    }
    return true;
  }

  async uploadImage(file: File): Promise<FileUploadResult> {
    return {
      id: crypto.randomUUID(),
      filename: file.name,
      original_name: file.name,
      url: URL.createObjectURL(file),
      size: file.size,
      type: file.type,
      uploaded_at: new Date().toISOString(),
    };
  }

  async uploadAvatar(file: File): Promise<FileUploadResult> {
    const data = await apiClient.upload<{ url: string }>('/user/avatar', file);
    return {
      id: crypto.randomUUID(),
      filename: file.name,
      original_name: file.name,
      url: data.url,
      size: file.size,
      type: file.type,
      uploaded_at: new Date().toISOString(),
    };
  }

  // ============================================
  // Search Operations
  // ============================================

  async searchTasks(query: string, options?: SearchOptions): Promise<SearchResult> {
    const startTime = Date.now();
    const params = new URLSearchParams({ q: query });
    if (options?.limit) params.set('limit', String(options.limit));
    
    const data = await apiClient.get<ApiTask[]>(`/search?${params}`);
    const tasks = data.map(mapApiTaskToTask);
    
    return {
      tasks,
      totalCount: tasks.length,
      searchTime: Date.now() - startTime,
    };
  }

  // ============================================
  // User Settings Operations
  // ============================================

  async getUserSettings(): Promise<UserSettings> {
    return {
      deadline_notification_enabled: true,
      deadline_notification_days: 1,
    };
  }

  async saveUserSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
    const current = await this.getUserSettings();
    return { ...current, ...settings };
  }

  // ============================================
  // User Profile Operations
  // ============================================

  async getUserProfile(): Promise<UserProfile | null> {
    try {
      const data = await apiClient.get<ApiUserProfile>('/user/profile');
      return {
        id: data.id,
        username: data.username || data.email,
        avatar_url: data.avatar_url || null,
        settings: {},
        updated_at: data.updated_at,
      };
    } catch {
      return null;
    }
  }

  async saveUserProfile(profile: Partial<UserProfile>): Promise<UserProfile> {
    const body: Record<string, unknown> = {};
    if (profile.username) body.username = profile.username;
    if (profile.avatar_url) body.avatar_url = profile.avatar_url;
    
    const data = await apiClient.put<ApiUserProfile>('/user/profile', body);
    return {
      id: data.id,
      username: data.username || data.email,
      avatar_url: data.avatar_url || null,
      settings: {},
      updated_at: data.updated_at,
    };
  }

  // ============================================
  // App Info Operations
  // ============================================

  async getAppInfo(): Promise<AppInfo> {
    try {
      const data = await apiClient.get<AppInfo>('/app-info');
      return data;
    } catch {
      return {};
    }
  }
}
