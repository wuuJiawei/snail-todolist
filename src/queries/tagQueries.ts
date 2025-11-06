import { queryOptions } from "@tanstack/react-query";
import { fetchAllTags } from "@/services/tagService";
import type { Tag } from "@/types/tag";

export const tagKeys = {
  all: ["tags"] as const,
  forScope: (scope: string | null = null) => [...tagKeys.all, scope ?? "global"] as const,
};

export const tagQueries = {
  forScope: (scope: string | null = null) =>
    queryOptions<Tag[]>({
      queryKey: tagKeys.forScope(scope),
      queryFn: () => fetchAllTags(scope),
      staleTime: 10 * 60 * 1000,
      gcTime: 15 * 60 * 1000,
    }),
};
