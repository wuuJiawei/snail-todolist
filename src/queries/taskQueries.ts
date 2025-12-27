import { queryOptions } from "@tanstack/react-query";
import * as storageOps from "@/storage/operations";
import { isOfflineMode } from "@/storage";
import type { Task } from "@/types/task";

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
      queryFn: () => storageOps.fetchTasks(false),
      staleTime: 5 * 60 * 1000,
      refetchOnReconnect: !isOfflineMode,
      refetchInterval: isOfflineMode ? false : 60 * 1000,
      refetchIntervalInBackground: !isOfflineMode,
    }),
  trashed: () =>
    queryOptions<Task[]>({
      queryKey: taskKeys.trashed(),
      queryFn: storageOps.fetchDeletedTasks,
      staleTime: 5 * 60 * 1000,
      refetchOnReconnect: !isOfflineMode,
      gcTime: 10 * 60 * 1000,
    }),
  abandoned: () =>
    queryOptions<Task[]>({
      queryKey: taskKeys.abandoned(),
      queryFn: storageOps.fetchAbandonedTasks,
      staleTime: 5 * 60 * 1000,
      refetchOnReconnect: !isOfflineMode,
      gcTime: 10 * 60 * 1000,
    }),
};
