import { queryOptions } from "@tanstack/react-query";
import * as storageOps from "@/data/operations";
import type { Tag } from "@/types/tag";

export const tagKeys = {
  all: ["tags"] as const,
  scopes: () => [...tagKeys.all, "scope"] as const,
  forScope: (scope: string | null = null) => [...tagKeys.scopes(), scope ?? "global"] as const,
  allVisible: () => [...tagKeys.all, "all-visible"] as const,
  taskMappings: () => [...tagKeys.all, "task-mapping"] as const,
  forTasks: (taskIds: string[]) => [...tagKeys.taskMappings(), ...[...taskIds].sort()] as const,
};

export const tagQueries = {
  forScope: (scope: string | null = null) =>
    queryOptions<Tag[]>({
      queryKey: tagKeys.forScope(scope),
      queryFn: () => storageOps.fetchAllTags(scope),
      staleTime: 10 * 60 * 1000,
      gcTime: 15 * 60 * 1000,
    }),
  allVisible: () =>
    queryOptions<Tag[]>({
      queryKey: tagKeys.allVisible(),
      queryFn: () => storageOps.fetchAllTags(undefined),
      staleTime: 10 * 60 * 1000,
      gcTime: 15 * 60 * 1000,
    }),
  forTasks: (taskIds: string[]) =>
    queryOptions<Record<string, Tag[]>>({
      queryKey: tagKeys.forTasks(taskIds),
      queryFn: () => taskIds.length > 0 ? storageOps.getTagsByTaskIds(taskIds) : Promise.resolve({}),
      staleTime: 10 * 60 * 1000,
      gcTime: 15 * 60 * 1000,
    }),
};
