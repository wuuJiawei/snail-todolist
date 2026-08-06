import { beforeEach, describe, expect, it, vi } from "vitest";

const tasks = vi.hoisted(() => ({
  moveToTrash: vi.fn(),
  restore: vi.fn(),
  abandon: vi.fn(),
  restoreAbandoned: vi.fn(),
  reorder: vi.fn(),
  update: vi.fn(),
}));
const projects = vi.hoisted(() => ({ update: vi.fn() }));

vi.mock("./createDataProvider", () => ({
  getDataProvider: () => ({ tasks, projects }),
}));

import { abandonTask, batchUpdateSortOrder, moveToTrash, restoreAbandonedTask, restoreFromTrash, updateProject, updateTask } from "./operations";

describe("task operation compatibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const operation of Object.values(tasks)) operation.mockResolvedValue({ id: "task-1" });
    projects.update.mockResolvedValue({ id: "project-1", name: "Next", icon: "folder", count: 0 });
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
    expect(tasks.reorder).toHaveBeenCalledWith([{ id: "task-1", order: 1000 }]);
  });

  it("normalizes repository errors for existing boolean callers", async () => {
    tasks.moveToTrash.mockRejectedValueOnce(new Error("network"));
    await expect(moveToTrash("task-1")).resolves.toBe(false);
  });

  it("preserves partial update semantics at the domain boundary", async () => {
    await updateTask("task-1", { title: "Next" });
    await updateProject("project-1", { name: "Next" });
    expect(tasks.update).toHaveBeenCalledWith("task-1", { title: "Next" });
    expect(projects.update).toHaveBeenCalledWith("project-1", { name: "Next" });
  });
});
