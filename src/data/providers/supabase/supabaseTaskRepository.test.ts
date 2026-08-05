import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseAdapter } from "./SupabaseAdapter";
import { SupabaseTaskRepository } from "./supabaseTaskRepository";

describe("SupabaseTaskRepository contract", () => {
  const adapter = {
    updateTask: vi.fn(),
    batchUpdateSortOrder: vi.fn(),
  };
  const repository = new SupabaseTaskRepository(adapter as unknown as SupabaseAdapter);

  beforeEach(() => {
    vi.clearAllMocks();
    adapter.updateTask.mockImplementation(async (id, updates) => ({ id, title: "task", completed: false, ...updates }));
    adapter.batchUpdateSortOrder.mockResolvedValue(true);
  });

  it("expresses trash and restore as business operations", async () => {
    await repository.moveToTrash("task-1");
    expect(adapter.updateTask).toHaveBeenLastCalledWith("task-1", {
      deleted: true,
      deleted_at: expect.any(String),
    });

    await repository.restore("task-1");
    expect(adapter.updateTask).toHaveBeenLastCalledWith("task-1", {
      deleted: false,
      deleted_at: undefined,
    });
  });

  it("expresses abandon as a mutually exclusive task state", async () => {
    await repository.abandon("task-1");
    expect(adapter.updateTask).toHaveBeenCalledWith("task-1", {
      abandoned: true,
      abandoned_at: expect.any(String),
      completed: false,
      completed_at: undefined,
    });
  });

  it("converts a missing row to the unified not-found error", async () => {
    adapter.updateTask.mockResolvedValueOnce(null);
    await expect(repository.update("missing", { title: "x" })).rejects.toMatchObject({
      name: "DataError",
      code: "NOT_FOUND",
    });
  });

  it("sends reorder changes as one repository operation", async () => {
    const order = [{ id: "task-1", sort_order: 1000 }];
    await repository.reorder(order);
    expect(adapter.batchUpdateSortOrder).toHaveBeenCalledWith(order);
  });
});
