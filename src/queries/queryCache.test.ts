import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getProjects } from "@/data/operations";
import { projectQueries } from "./projectQueries";
import { tagKeys } from "./tagQueries";
import type { Project } from "@/types/project";
import type { Tag } from "@/types/tag";

vi.mock("@/data/operations", () => ({ getProjects: vi.fn() }));

const project = (id: string, name: string): Project => ({
  id,
  name,
  icon: "folder",
  count: 0,
});

describe("query cache boundaries", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
  });

  it("refetches projects after the list query is invalidated", async () => {
    const findAll = vi
      .fn<() => Promise<Project[]>>()
      .mockResolvedValueOnce([project("p1", "before")])
      .mockResolvedValueOnce([project("p1", "after")]);
    vi.mocked(getProjects).mockImplementation(findAll);

    expect(await queryClient.fetchQuery(projectQueries.list())).toEqual([project("p1", "before")]);
    await queryClient.invalidateQueries({ queryKey: projectQueries.list().queryKey });
    expect(await queryClient.fetchQuery(projectQueries.list())).toEqual([project("p1", "after")]);
    expect(findAll).toHaveBeenCalledTimes(2);
  });

  it("keeps scoped tag lists isolated from task-tag mappings", () => {
    const tag: Tag = { id: "tag-1", name: "before", project_id: null };
    const mapping = { "task-1": [tag] };
    queryClient.setQueryData(tagKeys.forScope(null), [tag]);
    queryClient.setQueryData(tagKeys.forTasks(["task-1"]), mapping);

    queryClient.setQueriesData<Tag[]>({ queryKey: tagKeys.scopes() }, (tags = []) =>
      tags.map((item) => ({ ...item, name: "after" }))
    );

    expect(queryClient.getQueryData<Tag[]>(tagKeys.forScope(null))?.[0].name).toBe("after");
    expect(queryClient.getQueryData(tagKeys.forTasks(["task-1"]))).toEqual(mapping);
  });
});
