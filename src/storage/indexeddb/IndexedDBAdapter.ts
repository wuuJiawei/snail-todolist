/**
 * IndexedDB Storage Adapter
 * Implements the StorageAdapter interface using IndexedDB for offline storage
 */

import { v4 as uuidv4 } from 'uuid';
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
  DB_STORES,
} from '../types';

const DB_NAME = 'snail_todo_db';
const DB_VERSION = 1;

/**
 * Task-Tag junction record for IndexedDB
 */
interface TaskTagRecord {
  task_id: string;
  tag_id: string;
  created_at: string;
}

export class IndexedDBAdapter implements StorageAdapter {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize the IndexedDB database
   * Creates all required object stores and indexes
   */
  async initialize(): Promise<void> {
    if (this.db) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        this.initPromise = null;
        reject(new Error(`Failed to open IndexedDB: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this.createObjectStores(db);
      };
    });

    return this.initPromise;
  }

  /**
   * Create all object stores and indexes
   */
  private createObjectStores(db: IDBDatabase): void {
    // Tasks store
    if (!db.objectStoreNames.contains(DB_STORES.TASKS)) {
      const taskStore = db.createObjectStore(DB_STORES.TASKS, { keyPath: 'id' });
      taskStore.createIndex('project', 'project', { unique: false });
      taskStore.createIndex('completed', 'completed', { unique: false });
      taskStore.createIndex('deleted', 'deleted', { unique: false });
      taskStore.createIndex('abandoned', 'abandoned', { unique: false });
      taskStore.createIndex('flagged', 'flagged', { unique: false });
      taskStore.createIndex('sort_order', 'sort_order', { unique: false });
      taskStore.createIndex('created_at', 'created_at', { unique: false });
    }

    // Projects store
    if (!db.objectStoreNames.contains(DB_STORES.PROJECTS)) {
      const projectStore = db.createObjectStore(DB_STORES.PROJECTS, { keyPath: 'id' });
      projectStore.createIndex('sort_order', 'sort_order', { unique: false });
      projectStore.createIndex('created_at', 'created_at', { unique: false });
    }

    // Tags store
    if (!db.objectStoreNames.contains(DB_STORES.TAGS)) {
      const tagStore = db.createObjectStore(DB_STORES.TAGS, { keyPath: 'id' });
      tagStore.createIndex('project_id', 'project_id', { unique: false });
      tagStore.createIndex('name', 'name', { unique: false });
    }

    // Task-Tags junction store (composite key)
    if (!db.objectStoreNames.contains(DB_STORES.TASK_TAGS)) {
      const taskTagStore = db.createObjectStore(DB_STORES.TASK_TAGS, {
        keyPath: ['task_id', 'tag_id'],
      });
      taskTagStore.createIndex('task_id', 'task_id', { unique: false });
      taskTagStore.createIndex('tag_id', 'tag_id', { unique: false });
    }

    // Pomodoro sessions store
    if (!db.objectStoreNames.contains(DB_STORES.POMODORO_SESSIONS)) {
      const pomodoroStore = db.createObjectStore(DB_STORES.POMODORO_SESSIONS, { keyPath: 'id' });
      pomodoroStore.createIndex('task_id', 'task_id', { unique: false });
      pomodoroStore.createIndex('created_at', 'created_at', { unique: false });
    }

    // Task activities store
    if (!db.objectStoreNames.contains(DB_STORES.TASK_ACTIVITIES)) {
      const activityStore = db.createObjectStore(DB_STORES.TASK_ACTIVITIES, { keyPath: 'id' });
      activityStore.createIndex('task_id', 'task_id', { unique: false });
      activityStore.createIndex('created_at', 'created_at', { unique: false });
    }
  }

  /**
   * Check if the database is initialized and ready
   */
  isReady(): boolean {
    return this.db !== null;
  }

  /**
   * Get the database instance, throwing if not initialized
   */
  private getDB(): IDBDatabase {
    if (!this.db) {
      throw new Error('IndexedDB not initialized. Call initialize() first.');
    }
    return this.db;
  }

  /**
   * Helper to wrap IndexedDB request in a Promise
   */
  private promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Helper to get all records from a store
   */
  private async getAllFromStore<T>(storeName: string): Promise<T[]> {
    const db = this.getDB();
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    return this.promisifyRequest(store.getAll());
  }

  /**
   * Helper to get a record by key
   */
  private async getByKey<T>(storeName: string, key: IDBValidKey): Promise<T | null> {
    const db = this.getDB();
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const result = await this.promisifyRequest(store.get(key));
    return result ?? null;
  }

  /**
   * Helper to put a record
   */
  private async putRecord<T>(storeName: string, record: T): Promise<T> {
    const db = this.getDB();
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    await this.promisifyRequest(store.put(record));
    return record;
  }

  /**
   * Helper to delete a record by key
   */
  private async deleteByKey(storeName: string, key: IDBValidKey): Promise<boolean> {
    const db = this.getDB();
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    await this.promisifyRequest(store.delete(key));
    return true;
  }

  /**
   * Helper to get records by index
   */
  private async getByIndex<T>(
    storeName: string,
    indexName: string,
    value: IDBValidKey
  ): Promise<T[]> {
    const db = this.getDB();
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    return this.promisifyRequest(index.getAll(value));
  }

  // ============================================
  // Task Operations
  // ============================================

  async getTasks(filter?: TaskFilter, sort?: SortOptions[]): Promise<Task[]> {
    let tasks = await this.getAllFromStore<Task>(DB_STORES.TASKS);

    // Apply filters
    if (filter) {
      tasks = tasks.filter((task) => {
        if (filter.projectId !== undefined && task.project !== filter.projectId) {
          return false;
        }
        if (filter.completed !== undefined && task.completed !== filter.completed) {
          return false;
        }
        if (filter.deleted !== undefined && (task.deleted ?? false) !== filter.deleted) {
          return false;
        }
        if (filter.abandoned !== undefined && (task.abandoned ?? false) !== filter.abandoned) {
          return false;
        }
        if (filter.flagged !== undefined && (task.flagged ?? false) !== filter.flagged) {
          return false;
        }
        return true;
      });
    }

    // Apply sorting
    if (sort && sort.length > 0) {
      tasks.sort((a, b) => {
        for (const sortOption of sort) {
          const aVal = a[sortOption.field as keyof Task];
          const bVal = b[sortOption.field as keyof Task];

          // Handle null/undefined values
          if (aVal === null || aVal === undefined) {
            if (bVal === null || bVal === undefined) continue;
            return sortOption.nullsFirst ? -1 : 1;
          }
          if (bVal === null || bVal === undefined) {
            return sortOption.nullsFirst ? 1 : -1;
          }

          // Compare values
          let comparison = 0;
          if (typeof aVal === 'number' && typeof bVal === 'number') {
            comparison = aVal - bVal;
          } else if (typeof aVal === 'string' && typeof bVal === 'string') {
            comparison = aVal.localeCompare(bVal);
          }

          if (comparison !== 0) {
            return sortOption.direction === 'asc' ? comparison : -comparison;
          }
        }
        return 0;
      });
    }

    return tasks;
  }

  async getTaskById(id: string): Promise<Task | null> {
    return this.getByKey<Task>(DB_STORES.TASKS, id);
  }

  async createTask(task: CreateTaskInput): Promise<Task> {
    const now = new Date().toISOString();
    const newTask: Task = {
      ...task,
      id: uuidv4(),
      completed: task.completed ?? false,
      deleted: task.deleted ?? false,
      abandoned: task.abandoned ?? false,
      flagged: task.flagged ?? false,
      attachments: task.attachments ?? [],
    };

    // Set created_at if not provided (stored as updated_at in Task type)
    if (!newTask.updated_at) {
      newTask.updated_at = now;
    }

    await this.putRecord(DB_STORES.TASKS, newTask);
    return newTask;
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
    const existing = await this.getTaskById(id);
    if (!existing) {
      return null;
    }

    const updatedTask: Task = {
      ...existing,
      ...updates,
      id, // Ensure ID is not changed
      updated_at: new Date().toISOString(),
    };

    await this.putRecord(DB_STORES.TASKS, updatedTask);
    return updatedTask;
  }

  async deleteTask(id: string): Promise<boolean> {
    // Also delete associated task-tags
    const taskTags = await this.getByIndex<TaskTagRecord>(DB_STORES.TASK_TAGS, 'task_id', id);
    const db = this.getDB();
    const transaction = db.transaction([DB_STORES.TASKS, DB_STORES.TASK_TAGS], 'readwrite');

    const taskStore = transaction.objectStore(DB_STORES.TASKS);
    const taskTagStore = transaction.objectStore(DB_STORES.TASK_TAGS);

    // Delete task
    taskStore.delete(id);

    // Delete associated task-tags
    for (const taskTag of taskTags) {
      taskTagStore.delete([taskTag.task_id, taskTag.tag_id]);
    }

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async batchUpdateSortOrder(updates: Array<{ id: string; sort_order: number }>): Promise<boolean> {
    if (updates.length === 0) return true;

    const db = this.getDB();
    const transaction = db.transaction(DB_STORES.TASKS, 'readwrite');
    const store = transaction.objectStore(DB_STORES.TASKS);

    for (const update of updates) {
      const task = await this.promisifyRequest(store.get(update.id));
      if (task) {
        task.sort_order = update.sort_order;
        store.put(task);
      }
    }

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // ============================================
  // Project Operations
  // ============================================

  async getProjects(): Promise<Project[]> {
    const projects = await this.getAllFromStore<Project>(DB_STORES.PROJECTS);
    // Sort by sort_order
    return projects.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }

  async getProjectById(id: string): Promise<Project | null> {
    return this.getByKey<Project>(DB_STORES.PROJECTS, id);
  }

  async createProject(project: CreateProjectInput): Promise<Project> {
    const now = new Date().toISOString();
    const newProject: Project = {
      ...project,
      id: uuidv4(),
      count: 0,
      created_at: now,
      updated_at: now,
    };

    await this.putRecord(DB_STORES.PROJECTS, newProject);
    return newProject;
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | null> {
    const existing = await this.getProjectById(id);
    if (!existing) {
      return null;
    }

    const updatedProject: Project = {
      ...existing,
      ...updates,
      id, // Ensure ID is not changed
      updated_at: new Date().toISOString(),
    };

    await this.putRecord(DB_STORES.PROJECTS, updatedProject);
    return updatedProject;
  }

  async deleteProject(id: string): Promise<boolean> {
    // Update tasks that belong to this project (set project to undefined)
    const tasks = await this.getTasks({ projectId: id });
    for (const task of tasks) {
      await this.updateTask(task.id, { project: undefined });
    }

    // Delete tags that belong to this project
    const tags = await this.getTags(id);
    for (const tag of tags) {
      await this.deleteTag(tag.id);
    }

    return this.deleteByKey(DB_STORES.PROJECTS, id);
  }

  async batchUpdateProjectSortOrder(
    updates: Array<{ id: string; sort_order: number }>
  ): Promise<boolean> {
    if (updates.length === 0) return true;

    const db = this.getDB();
    const transaction = db.transaction(DB_STORES.PROJECTS, 'readwrite');
    const store = transaction.objectStore(DB_STORES.PROJECTS);

    for (const update of updates) {
      const project = await this.promisifyRequest(store.get(update.id));
      if (project) {
        project.sort_order = update.sort_order;
        store.put(project);
      }
    }

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // ============================================
  // Tag Operations
  // ============================================

  async getTags(projectId?: string | null): Promise<Tag[]> {
    const allTags = await this.getAllFromStore<Tag>(DB_STORES.TAGS);

    if (projectId === undefined) {
      // Return all tags
      return allTags;
    }

    // Filter by project_id (null means global tags)
    return allTags.filter((tag) => {
      if (projectId === null) {
        return tag.project_id === null || tag.project_id === undefined;
      }
      return tag.project_id === projectId;
    });
  }

  async getTagById(id: string): Promise<Tag | null> {
    return this.getByKey<Tag>(DB_STORES.TAGS, id);
  }

  async createTag(name: string, projectId?: string | null): Promise<Tag> {
    const newTag: Tag = {
      id: uuidv4(),
      name,
      project_id: projectId ?? null,
      created_at: new Date().toISOString(),
    };

    await this.putRecord(DB_STORES.TAGS, newTag);
    return newTag;
  }

  async updateTag(id: string, updates: Partial<Tag>): Promise<Tag | null> {
    const existing = await this.getTagById(id);
    if (!existing) {
      return null;
    }

    const updatedTag: Tag = {
      ...existing,
      ...updates,
      id, // Ensure ID is not changed
    };

    await this.putRecord(DB_STORES.TAGS, updatedTag);
    return updatedTag;
  }

  async deleteTag(id: string): Promise<boolean> {
    // Delete all task-tag associations for this tag
    const taskTags = await this.getByIndex<TaskTagRecord>(DB_STORES.TASK_TAGS, 'tag_id', id);
    const db = this.getDB();
    const transaction = db.transaction([DB_STORES.TAGS, DB_STORES.TASK_TAGS], 'readwrite');

    const tagStore = transaction.objectStore(DB_STORES.TAGS);
    const taskTagStore = transaction.objectStore(DB_STORES.TASK_TAGS);

    // Delete tag
    tagStore.delete(id);

    // Delete associated task-tags
    for (const taskTag of taskTags) {
      taskTagStore.delete([taskTag.task_id, taskTag.tag_id]);
    }

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // ============================================
  // Task-Tag Operations
  // ============================================

  async getTagsByTaskIds(taskIds: string[]): Promise<Record<string, Tag[]>> {
    const result: Record<string, Tag[]> = {};

    // Initialize empty arrays for all task IDs
    for (const taskId of taskIds) {
      result[taskId] = [];
    }

    if (taskIds.length === 0) {
      return result;
    }

    // Get all task-tags
    const allTaskTags = await this.getAllFromStore<TaskTagRecord>(DB_STORES.TASK_TAGS);
    const relevantTaskTags = allTaskTags.filter((tt) => taskIds.includes(tt.task_id));

    // Get unique tag IDs
    const tagIds = [...new Set(relevantTaskTags.map((tt) => tt.tag_id))];

    // Fetch all relevant tags
    const tags: Tag[] = [];
    for (const tagId of tagIds) {
      const tag = await this.getTagById(tagId);
      if (tag) {
        tags.push(tag);
      }
    }

    // Build the result map
    const tagMap = new Map(tags.map((t) => [t.id, t]));
    for (const taskTag of relevantTaskTags) {
      const tag = tagMap.get(taskTag.tag_id);
      if (tag) {
        result[taskTag.task_id].push(tag);
      }
    }

    return result;
  }

  async attachTagToTask(taskId: string, tagId: string): Promise<void> {
    const record: TaskTagRecord = {
      task_id: taskId,
      tag_id: tagId,
      created_at: new Date().toISOString(),
    };

    await this.putRecord(DB_STORES.TASK_TAGS, record);
  }

  async detachTagFromTask(taskId: string, tagId: string): Promise<void> {
    const db = this.getDB();
    const transaction = db.transaction(DB_STORES.TASK_TAGS, 'readwrite');
    const store = transaction.objectStore(DB_STORES.TASK_TAGS);
    store.delete([taskId, tagId]);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // ============================================
  // Pomodoro Operations
  // ============================================

  async getPomodoroSessions(taskId?: string): Promise<PomodoroSession[]> {
    if (taskId) {
      return this.getByIndex<PomodoroSession>(DB_STORES.POMODORO_SESSIONS, 'task_id', taskId);
    }
    return this.getAllFromStore<PomodoroSession>(DB_STORES.POMODORO_SESSIONS);
  }

  async getPomodoroSessionById(id: string): Promise<PomodoroSession | null> {
    return this.getByKey<PomodoroSession>(DB_STORES.POMODORO_SESSIONS, id);
  }

  async createPomodoroSession(session: CreatePomodoroInput): Promise<PomodoroSession> {
    const newSession: PomodoroSession = {
      ...session,
      id: uuidv4(),
      created_at: new Date().toISOString(),
    };

    await this.putRecord(DB_STORES.POMODORO_SESSIONS, newSession);
    return newSession;
  }

  async updatePomodoroSession(
    id: string,
    updates: Partial<PomodoroSession>
  ): Promise<PomodoroSession | null> {
    const existing = await this.getPomodoroSessionById(id);
    if (!existing) {
      return null;
    }

    const updatedSession: PomodoroSession = {
      ...existing,
      ...updates,
      id, // Ensure ID is not changed
    };

    await this.putRecord(DB_STORES.POMODORO_SESSIONS, updatedSession);
    return updatedSession;
  }

  async deletePomodoroSession(id: string): Promise<boolean> {
    return this.deleteByKey(DB_STORES.POMODORO_SESSIONS, id);
  }

  // ============================================
  // Activity Operations
  // ============================================

  async getTaskActivities(taskId: string): Promise<TaskActivity[]> {
    const activities = await this.getByIndex<TaskActivity>(
      DB_STORES.TASK_ACTIVITIES,
      'task_id',
      taskId
    );
    // Sort by created_at ascending (chronological order)
    return activities.sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  async createTaskActivity(activity: CreateActivityInput): Promise<TaskActivity> {
    const newActivity: TaskActivity = {
      ...activity,
      id: uuidv4(),
      created_at: new Date().toISOString(),
    };

    await this.putRecord(DB_STORES.TASK_ACTIVITIES, newActivity);
    return newActivity;
  }
}

// Export singleton instance for convenience
export const indexedDBAdapter = new IndexedDBAdapter();
