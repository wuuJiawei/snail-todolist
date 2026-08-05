import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = vi.hoisted(() => ({
  updateTask: vi.fn(),
  batchUpdateSortOrder: vi.fn(),
}));

vi.mock("./index", () => ({
  getStorage: () => storage,
  initializeStorage: vi.fn().mockResolvedValue(undefined),
  isOfflineMode: false,
}));

vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));

import {
  abandonTask,
  batchUpdateSortOrder,
  moveToTrash,
  restoreAbandonedTask,
  restoreFromTrash,
} from "./operations";

describe("task state transition behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storage.updateTask.mockImplementation(async (id, updates) => ({ id, title: "task", ...updates }));
    storage.batchUpdateSortOrder.mockResolvedValue(true);
  });

  it("moves a task to trash with a deletion timestamp", async () => {
    await expect(moveToTrash("task-1")).resolves.toBe(true);

    expect(storage.updateTask).toHaveBeenCalledWith("task-1", {
      deleted: true,
      deleted_at: expect.any(String),
    });
  });

  it("restores a trashed task and clears its deletion timestamp", async () => {
    await expect(restoreFromTrash("task-1")).resolves.toBe(true);

    expect(storage.updateTask).toHaveBeenCalledWith("task-1", {
      deleted: false,
      deleted_at: undefined,
    });
  });

  it("abandons an active task without leaving it completed", async () => {
    await expect(abandonTask("task-1")).resolves.toBe(true);

    expect(storage.updateTask).toHaveBeenCalledWith("task-1", {
      abandoned: true,
      abandoned_at: expect.any(String),
      completed: false,
      completed_at: undefined,
    });
  });

  it("restores an abandoned task and clears its timestamp", async () => {
    await expect(restoreAbandonedTask("task-1")).resolves.toBe(true);

    expect(storage.updateTask).toHaveBeenCalledWith("task-1", {
      abandoned: false,
      abandoned_at: undefined,
    });
  });

  it("forwards the complete task order as one batch", async () => {
    const order = [
      { id: "task-1", sort_order: 1000 },
      { id: "task-2", sort_order: 2000 },
    ];

    await expect(batchUpdateSortOrder(order)).resolves.toBe(true);
    expect(storage.batchUpdateSortOrder).toHaveBeenCalledOnce();
    expect(storage.batchUpdateSortOrder).toHaveBeenCalledWith(order);
  });
});
