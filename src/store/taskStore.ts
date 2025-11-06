import { create } from "zustand";
import { Task, TaskAttachment } from "@/types/task";
import { Tag } from "@/types/tag";

export interface TaskState {
  tasks: Task[];
  trashedTasks: Task[];
  abandonedTasks: Task[];
  selectedTaskId: string | null;
  loading: boolean;
  trashedLoading: boolean;
  abandonedLoading: boolean;
  trashedLoaded: boolean;
  abandonedLoaded: boolean;
  hasLoaded: boolean;
  taskIdToTags: Record<string, Tag[]>;
  tagsCache: Record<string, Tag[]>;
  tagsVersion: number;
}

export interface TaskActions {
  setTasks: (tasks: Task[]) => void;
  prependTask: (task: Task) => void;
  replaceTaskById: (id: string, task: Task) => void;
  removeTask: (id: string) => void;
  setTrashedTasks: (tasks: Task[]) => void;
  setAbandonedTasks: (tasks: Task[]) => void;
  setSelectedTaskId: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
  setTrashedLoading: (loading: boolean) => void;
  setAbandonedLoading: (loading: boolean) => void;
  setTrashedLoaded: (loaded: boolean) => void;
  setAbandonedLoaded: (loaded: boolean) => void;
  setHasLoaded: (loaded: boolean) => void;
  setTaskIdToTags: (mapping: Record<string, Tag[]>) => void;
  setTagsCache: (cache: Record<string, Tag[]>) => void;
  incrementTagsVersion: () => void;
  insertOptimisticTask: (payload: {
    tempId: string;
    title: string;
    completed?: boolean;
    date?: string;
    project?: string;
    description?: string;
    icon?: string;
    attachments?: TaskAttachment[];
    sort_order?: number;
  }) => void;
}

export type TaskStore = TaskState & TaskActions;

const initialState: TaskState = {
  tasks: [],
  trashedTasks: [],
  abandonedTasks: [],
  selectedTaskId: null,
  loading: false,
  trashedLoading: false,
  abandonedLoading: false,
  trashedLoaded: false,
  abandonedLoaded: false,
  hasLoaded: false,
  taskIdToTags: {},
  tagsCache: {},
  tagsVersion: 0,
};

export const useTaskStore = create<TaskStore>()((set, get) => ({
  ...initialState,
  setTasks: (tasks) => set({ tasks }),
  prependTask: (task) =>
    set((state) => ({
      tasks: [task, ...state.tasks],
    })),
  replaceTaskById: (id, task) =>
    set((state) => ({
      tasks: state.tasks.map((existing) => (existing.id === id ? task : existing)),
    })),
  removeTask: (id) =>
    set((state) => ({
      tasks: state.tasks.filter((task) => task.id !== id),
      trashedTasks: state.trashedTasks.filter((task) => task.id !== id),
      abandonedTasks: state.abandonedTasks.filter((task) => task.id !== id),
    })),
  setTrashedTasks: (tasks) => set({ trashedTasks: tasks }),
  setAbandonedTasks: (tasks) => set({ abandonedTasks: tasks }),
  setSelectedTaskId: (id) => set({ selectedTaskId: id }),
  setLoading: (loading) => set({ loading }),
  setTrashedLoading: (loading) => set({ trashedLoading: loading }),
  setAbandonedLoading: (loading) => set({ abandonedLoading: loading }),
  setTrashedLoaded: (loaded) => set({ trashedLoaded: loaded }),
  setAbandonedLoaded: (loaded) => set({ abandonedLoaded: loaded }),
  setHasLoaded: (loaded) => set({ hasLoaded: loaded }),
  setTaskIdToTags: (mapping) => set({ taskIdToTags: mapping }),
  setTagsCache: (cache) => set({ tagsCache: cache }),
  incrementTagsVersion: () => set((state) => ({ tagsVersion: state.tagsVersion + 1 })),
  insertOptimisticTask: ({ tempId, attachments, completed, ...rest }) => {
    const optimisticTask: Task = {
      id: tempId,
      attachments: attachments ?? [],
      completed: completed ?? false,
      ...rest,
    } as Task;
    get().prependTask(optimisticTask);
  },
}));

