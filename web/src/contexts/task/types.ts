
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
  trashedLoading: boolean;
  abandonedLoading: boolean;
  trashedLoaded: boolean;
  abandonedLoaded: boolean;
  selectedTask: Task | null;
  selectedProject: string;
  addTask: (task: Omit<Task, "id">) => Promise<void>;
  updateTask: (id: string, task: Partial<Task>) => Promise<void>;
  moveToTrash: (id: string) => Promise<void>;
  restoreFromTrash: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  abandonTask: (id: string) => Promise<void>;
  restoreAbandonedTask: (id: string) => Promise<void>;
  loadTrashedTasks: () => Promise<void>;
  loadAbandonedTasks: () => Promise<void>;
  selectTask: (id: string | null) => void;
  selectProject: (id: string) => void;
  reorderTasks: (projectId: string, sourceIndex: number, destinationIndex: number, isCompletedArea?: boolean) => Promise<void>;
  getProjectTaskCount: (projectId: string) => number;
  getTrashCount: () => number;
  getAbandonedCount: () => number;

  getTaskTags: (taskId: string) => Tag[];
  attachTagToTask: (taskId: string, tagId: string, tagData?: Tag) => Promise<void>;
  detachTagFromTask: (taskId: string, tagId: string) => Promise<void>;
  listAllTags: (projectId?: string | null) => Promise<Tag[]>;
  createTag: (name: string, projectId?: string | null) => Promise<Tag | null>;
  deleteTagPermanently: (tagId: string) => Promise<boolean>;
  updateTagProject: (tagId: string, projectId: string | null) => Promise<Tag | null>;
  renameTag: (tagId: string, newName: string) => Promise<Tag | null>;
  refreshAllTags: () => Promise<boolean>;
  getAllTagUsageCounts: () => Record<string, number>;
  getCachedTags: (projectId?: string | null) => Tag[];
  ensureTagsLoaded: (projectId?: string | null) => Promise<void>;
  tagsVersion: number;
}
