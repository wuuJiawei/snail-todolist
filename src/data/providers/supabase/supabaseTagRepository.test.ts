import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { SupabaseTagRepository } from "./supabaseTagRepository";

describe("SupabaseTagRepository", () => {
  it("groups tag rows by task without leaking relation rows", async () => {
    const linkQuery = { select: vi.fn(), in: vi.fn() };
    linkQuery.select.mockReturnValue(linkQuery);
    linkQuery.in.mockResolvedValue({
      data: [
        { task_id: "task-1", tag: { id: "tag-1", name: "Urgent", project_id: null, user_id: "user-1" } },
        { task_id: "task-2", tag: { id: "tag-1", name: "Urgent", project_id: null, user_id: "user-1" } },
      ],
      error: null,
    });
    const client = {
      from: vi.fn().mockReturnValue(linkQuery),
    } as unknown as SupabaseClient<Database>;
    const repository = new SupabaseTagRepository(client);

    const domainTag = { id: "tag-1", name: "Urgent", projectId: null, ownerId: "user-1", createdAt: undefined };
    await expect(repository.findByTaskIds(["task-1", "task-2", "task-3"])).resolves.toEqual({
      "task-1": [domainTag],
      "task-2": [domainTag],
      "task-3": [],
    });
    expect(client.from).toHaveBeenCalledTimes(1);
    expect(client.from).toHaveBeenCalledWith("task_tags");
    expect(linkQuery.select).toHaveBeenCalledWith("task_id, tag:tags(*)");
  });

  it("starts task-tag batches in parallel", async () => {
    const pending: Array<(value: { data: []; error: null }) => void> = [];
    const query = { select: vi.fn(), in: vi.fn() };
    query.select.mockReturnValue(query);
    query.in.mockImplementation(() => new Promise((resolve) => pending.push(resolve)));
    const client = { from: vi.fn(() => query) } as unknown as SupabaseClient<Database>;
    const repository = new SupabaseTagRepository(client);
    const taskIds = Array.from({ length: 201 }, (_, index) => `task-${index}`);

    const resultPromise = repository.findByTaskIds(taskIds);
    await vi.waitFor(() => expect(query.in).toHaveBeenCalledTimes(3));
    pending.forEach((resolve) => resolve({ data: [], error: null }));

    const result = await resultPromise;
    expect(Object.keys(result)).toHaveLength(201);
    expect(client.from).toHaveBeenCalledTimes(3);
  });

  it("updates name and project scope in one request", async () => {
    const updated = { id: "tag-1", name: "Next", project_id: "project-2", user_id: "user-1" };
    const query = { update: vi.fn(), eq: vi.fn(), select: vi.fn(), maybeSingle: vi.fn() };
    query.update.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.select.mockReturnValue(query);
    query.maybeSingle.mockResolvedValue({ data: updated, error: null });
    const client = { from: vi.fn(() => query) } as unknown as SupabaseClient<Database>;
    const repository = new SupabaseTagRepository(client);

    await expect(repository.update("tag-1", { name: " Next ", projectId: "project-2" })).resolves.toEqual({
      id: "tag-1", name: "Next", projectId: "project-2", ownerId: "user-1", createdAt: undefined,
    });
    expect(query.update).toHaveBeenCalledWith({ name: "Next", project_id: "project-2" });
  });
});
