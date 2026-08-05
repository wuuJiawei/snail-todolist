/** Internal Supabase datasource retained while repositories absorb legacy query modules. */

import { Task } from '@/types/task';
import {
  TaskFilter,
  CreateTaskInput,
} from './legacyTypes';
import * as taskService from './legacy/taskService';

export class SupabaseAdapter {
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

}
