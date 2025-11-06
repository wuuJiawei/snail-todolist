import { queryOptions } from "@tanstack/react-query";
import { fetchTasks, fetchDeletedTasks, fetchAbandonedTasks } from "@/services/taskService";
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
      queryFn: () => fetchTasks(),
      staleTime: 5 * 60 * 1000,
      refetchOnReconnect: true,
      refetchInterval: 60 * 1000,
      refetchIntervalInBackground: true,
    }),
  trashed: () =>
    queryOptions<Task[]>({
      queryKey: taskKeys.trashed(),
      queryFn: () => fetchDeletedTasks(),
      staleTime: 5 * 60 * 1000,
      refetchOnReconnect: true,
      gcTime: 10 * 60 * 1000,
    }),
  abandoned: () =>
    queryOptions<Task[]>({
      queryKey: taskKeys.abandoned(),
      queryFn: () => fetchAbandonedTasks(),
      staleTime: 5 * 60 * 1000,
      refetchOnReconnect: true,
      gcTime: 10 * 60 * 1000,
    }),
};

