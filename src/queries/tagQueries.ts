import { queryOptions } from "@tanstack/react-query";
import { fetchAllTags } from "@/services/tagService";
import { getStorage, initializeStorage, isOfflineMode } from "@/storage";
import type { Tag } from "@/types/tag";

const fetchTagsWithAdapter = async (scope: string | null): Promise<Tag[]> => {
  if (isOfflineMode) {
    await initializeStorage();
    const storage = getStorage();
    return storage.getTags(scope);
  }
  return fetchAllTags(scope);
};

export const tagKeys = {
  all: ["tags"] as const,
  forScope: (scope: string | null = null) => [...tagKeys.all, scope ?? "global"] as const,
};

export const tagQueries = {
  forScope: (scope: string | null = null) =>
    queryOptions<Tag[]>({
      queryKey: tagKeys.forScope(scope),
      queryFn: () => fetchTagsWithAdapter(scope),
      staleTime: 10 * 60 * 1000,
      gcTime: 15 * 60 * 1000,
    }),
};
