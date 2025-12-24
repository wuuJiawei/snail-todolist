import { queryOptions } from "@tanstack/react-query";
import { fetchTasks, fetchDeletedTasks, fetchAbandonedTasks } from "@/services/taskService";
import { getStorage, initializeStorage, isOfflineMode } from "@/storage";
import type { Task } from "@/types/task";

const fetchTasksWithAdapter = async (): Promise<Task[]> => {
  if (isOfflineMode) {
    await initializeStorage();
    const storage = getStorage();
    return storage.getTasks({ deleted: false, abandoned: false });
  }
  return fetchTasks();
};

const fetchDeletedTasksWithAdapter = async (): Promise<Task[]> => {
  if (isOfflineMode) {
    await initializeStorage();
    const storage = getStorage();
    return storage.getTasks({ deleted: true, abandoned: false });
  }
  return fetchDeletedTasks();
};

const fetchAbandonedTasksWithAdapter = async (): Promise<Task[]> => {
  if (isOfflineMode) {
    await initializeStorage();
    const storage = getStorage();
    return storage.getTasks({ abandoned: true, deleted: false });
  }
  return fetchAbandonedTasks();
};

export const taskKeys = {
  all: ["tasks"] as const,
  active: () => [...taskKeys.all, "active"] as const,
  trashed: () => [...taskKeys.all, "trashed"] as const,
  abandoned: () => [...taskKeys.all, "abandoned"] as const,
};

export const taskQueries = {
  active: () =>
    queryOptions<Task[]>({
      queryKey: taskKeys.active(),
      queryFn: fetchTasksWithAdapter,
      staleTime: 5 * 60 * 1000,
      refetchOnReconnect: !isOfflineMode,
      refetchInterval: isOfflineMode ? false : 60 * 1000,
      refetchIntervalInBackground: !isOfflineMode,
    }),
  trashed: () =>
    queryOptions<Task[]>({
      queryKey: taskKeys.trashed(),
      queryFn: fetchDeletedTasksWithAdapter,
      staleTime: 5 * 60 * 1000,
      refetchOnReconnect: !isOfflineMode,
      gcTime: 10 * 60 * 1000,
    }),
  abandoned: () =>
    queryOptions<Task[]>({
      queryKey: taskKeys.abandoned(),
      queryFn: fetchAbandonedTasksWithAdapter,
      staleTime: 5 * 60 * 1000,
      refetchOnReconnect: !isOfflineMode,
      gcTime: 10 * 60 * 1000,
    }),
};
