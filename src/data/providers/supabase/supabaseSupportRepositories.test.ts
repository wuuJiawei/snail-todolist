import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { SupabaseActivityRepository, SupabaseDataTransferRepository, SupabaseSearchRepository } from "./supabaseSupportRepositories";

describe("SupabaseDataTransferRepository", () => {
  it("uses the authenticated atomic clear RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const repository = new SupabaseDataTransferRepository({ rpc } as unknown as SupabaseClient<Database>);

    await expect(repository.clearOwnedData()).resolves.toBeUndefined();
    expect(rpc).toHaveBeenCalledWith("clear_owned_data");
  });
});

describe("SupabaseActivityRepository", () => {
  it("returns the activity row created by Supabase", async () => {
    const activity = {
      id: "activity-1",
      task_id: "task-1",
      user_id: "user-1",
      anonymous_id: null,
      action: "task_created",
      metadata: { source: "test" },
      created_at: "2026-08-05T00:00:00.000Z",
    };
    const query = { insert: vi.fn(), select: vi.fn(), single: vi.fn() };
    query.insert.mockReturnValue(query);
    query.select.mockReturnValue(query);
    query.single.mockResolvedValue({ data: activity, error: null });
    const client = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }) },
      from: vi.fn(() => query),
    } as unknown as SupabaseClient<Database>;
    const repository = new SupabaseActivityRepository(client);

    await expect(repository.create("task-1", "task_created", { source: "test" })).resolves.toEqual(activity);
    expect(query.insert).toHaveBeenCalledWith({
      task_id: "task-1",
      action: "task_created",
      metadata: { source: "test" },
      user_id: "user-1",
    });
  });
});

describe("SupabaseSearchRepository", () => {
  it("maps successful ILIKE results and reports the database count", async () => {
    const task = { id: "task-1", title: "Write report", completed: false, attachments: "[]" };
    const query = { select: vi.fn(), or: vi.fn(), eq: vi.fn(), order: vi.fn(), limit: vi.fn() };
    query.select.mockReturnValue(query);
    query.or.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.order.mockReturnValue(query);
    query.limit.mockResolvedValue({ data: [task], count: 1, error: null });
    const client = { from: vi.fn(() => query) } as unknown as SupabaseClient<Database>;
    const repository = new SupabaseSearchRepository(client);

    const result = await repository.searchTasks("report", { includeCompleted: false, projectId: "project-1", limit: 5 });
    expect(result.tasks).toEqual([{ ...task, attachments: [] }]);
    expect(result.totalCount).toBe(1);
    expect(query.eq).toHaveBeenCalledWith("completed", false);
    expect(query.eq).toHaveBeenCalledWith("project", "project-1");
    expect(query.limit).toHaveBeenCalledWith(5);
  });
});
