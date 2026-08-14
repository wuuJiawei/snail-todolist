import { describe, expect, it } from "vitest";
import type { Task } from "@/types/task";
import { buildTaskActivityDrafts } from "./useTaskActivityRecorder";
import { calculateTaskSortOrder } from "./useTaskReorder";

const task = (id: string, sortOrder: number): Task => ({
  id,
  title: id,
  completed: false,
  project: "project-1",
  sort_order: sortOrder,
});

describe("task operation helpers", () => {
  it("places a reordered task between its surrounding sort orders", () => {
    expect(calculateTaskSortOrder([
      task("before", 1000),
      task("moved", 4000),
      task("after", 3000),
    ], 1)).toBe(2000);
  });

  it("records the business transitions represented by a task update", () => {
    const previous = { ...task("task-1", 1000), title: "before", flagged: false };
    const drafts = buildTaskActivityDrafts(previous, {
      title: "after",
      completed: true,
      flagged: true,
    });

    expect(drafts).toEqual([
      { action: "title_updated", metadata: { from: "before", to: "after" } },
      { action: "status_updated", metadata: { from: "active", to: "completed" } },
      { action: "task_flagged", metadata: { flagged: true } },
    ]);
  });

  it("records date, datetime and range changes as one task time activity", () => {
    const previous = {
      ...task("task-1", 1000),
      date: "2026-08-14T00:00:00.000Z",
      date_type: "date" as const,
    };

    expect(buildTaskActivityDrafts(previous, {
      date: "2026-08-14T09:00:00.000Z",
      date_type: "range",
      end_date: "2026-08-14T10:00:00.000Z",
    })).toEqual([{
      action: "task_time_updated",
      metadata: {
        from: { date: previous.date, dateType: "date", endDate: null },
        to: {
          date: "2026-08-14T09:00:00.000Z",
          dateType: "range",
          endDate: "2026-08-14T10:00:00.000Z",
        },
      },
    }]);
  });
});
