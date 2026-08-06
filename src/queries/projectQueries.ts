import { queryOptions } from "@tanstack/react-query";
import * as storageOps from "@/data/operations";
import type { Project } from "@/types/project";

export const projectKeys = {
  all: ["projects"] as const,
  list: () => [...projectKeys.all, "list"] as const,
};

export const projectQueries = {
  list: () =>
    queryOptions<Project[]>({
      queryKey: projectKeys.list(),
      queryFn: storageOps.getProjects,
      staleTime: 5 * 60 * 1000,
      refetchOnReconnect: true,
    }),
};
