import { useQuery } from "@tanstack/react-query";
import { tagQueries } from "@/queries/tagQueries";

export const useTags = (projectId?: string | null) => {
  const scope = projectId ?? null;
  return useQuery(tagQueries.forScope(scope));
};
