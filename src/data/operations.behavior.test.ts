import { beforeEach, describe, expect, it, vi } from "vitest";

const tasks = vi.hoisted(() => ({
  moveToTrash: vi.fn(),
  restore: vi.fn(),
  abandon: vi.fn(),
  restoreAbandoned: vi.fn(),
  reorder: vi.fn(),
}));

vi.mock("./createDataProvider", () => ({
  getDataProvider: () => ({ tasks }),
}));

import { abandonTask, batchUpdateSortOrder, moveToTrash, restoreAbandonedTask, restoreFromTrash } from "./operations";

describe("task operation compatibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const operation of Object.values(tasks)) operation.mockResolvedValue({ id: "task-1" });
  });

  it("delegates trash and restore to business repository methods", async () => {
    await expect(moveToTrash("task-1")).resolves.toBe(true);
    await expect(restoreFromTrash("task-1")).resolves.toBe(true);
    expect(tasks.moveToTrash).toHaveBeenCalledWith("task-1");
    expect(tasks.restore).toHaveBeenCalledWith("task-1");
  });

  it("delegates abandon and restore to business repository methods", async () => {
    await expect(abandonTask("task-1")).resolves.toBe(true);
    await expect(restoreAbandonedTask("task-1")).resolves.toBe(true);
    expect(tasks.abandon).toHaveBeenCalledWith("task-1");
    expect(tasks.restoreAbandoned).toHaveBeenCalledWith("task-1");
  });

  it("forwards the complete order as one batch", async () => {
    const order = [{ id: "task-1", sort_order: 1000 }];
    await expect(batchUpdateSortOrder(order)).resolves.toBe(true);
    expect(tasks.reorder).toHaveBeenCalledWith(order);
  });

  it("normalizes repository errors for existing boolean callers", async () => {
    tasks.moveToTrash.mockRejectedValueOnce(new Error("network"));
    await expect(moveToTrash("task-1")).resolves.toBe(false);
  });
});
