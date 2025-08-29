
import { Task } from "@/types/task";
import { Tag } from "@/types/tag";

export const SELECTED_PROJECT_KEY = 'selected-project';

export type TaskOperationType = "complete" | "abandon" | "delete" | "restore" | "update";

export interface TaskOperationState {
  taskId: string;
  operationType: TaskOperationType;
  progress: number; // 0-100
}

export interface TaskContextType {
  tasks: Task[];
  trashedTasks: Task[];
  abandonedTasks: Task[];
  loading: boolean;
  selectedTask: Task | null;
  selectedProject: string;
  addTask: (task: Omit<Task, "id">) => Promise<void>;
  updateTask: (id: string, task: Partial<Task>) => Promise<void>;
  moveToTrash: (id: string) => Promise<void>;
  restoreFromTrash: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>; // Permanent deletion
  abandonTask: (id: string) => Promise<void>;
  restoreAbandonedTask: (id: string) => Promise<void>;
  selectTask: (id: string | null) => void;
  selectProject: (id: string) => void;
  reorderTasks: (projectId: string, sourceIndex: number, destinationIndex: number, isCompletedArea?: boolean) => Promise<void>;
  getProjectTaskCount: (projectId: string) => number;
  getTrashCount: () => number;
  getAbandonedCount: () => number;

  // tags
  getTaskTags: (taskId: string) => Tag[];
  attachTagToTask: (taskId: string, tagId: string) => Promise<void>;
  detachTagFromTask: (taskId: string, tagId: string) => Promise<void>;
  listAllTags: (projectId?: string | null) => Promise<Tag[]>;
  createTag: (name: string, projectId?: string | null) => Promise<Tag | null>;
  deleteTagPermanently: (tagId: string) => Promise<boolean>;
  updateTagProject: (tagId: string, projectId: string | null) => Promise<Tag | null>;
  getAllTagUsageCounts: () => Record<string, number>;
  // tags cache & lifecycle
  getCachedTags: (projectId?: string | null) => Tag[];
  ensureTagsLoaded: (projectId?: string | null) => Promise<void>;
  tagsVersion: number; // bump when tags cache changes to trigger subscribers
}
