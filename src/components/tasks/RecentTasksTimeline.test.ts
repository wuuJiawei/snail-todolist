import { describe, expect, it } from "vitest";

import { buildTimelineGroups } from "@/utils/taskTimelineGroups";
import type { Project } from "@/types/project";
import type { Task } from "@/types/task";

const projects: Project[] = [
  { id: "project-b", name: "第二清单", icon: "folder", count: 0, sort_order: 1000 },
  { id: "project-a", name: "第一清单", icon: "folder", count: 0, sort_order: 2000 },
];

const task = (id: string, project: string, date?: string, completed = false): Task => ({
  id,
  title: id,
  completed,
  project,
  date,
});

describe("buildTimelineGroups", () => {
  it("puts overdue first and follows the existing project order", () => {
    const dates = [new Date(2026, 7, 13), new Date(2026, 7, 14)];
    const groups = buildTimelineGroups([
      task("project-a-task", "project-a", new Date(2026, 7, 13, 10).toISOString()),
      task("overdue-task", "project-a", new Date(2026, 7, 12, 10).toISOString()),
      task("project-b-task", "project-b", new Date(2026, 7, 13, 9).toISOString()),
    ], dates, "project", projects);

    expect(groups.map((group) => group.title ?? "逾期")).toEqual([
      "逾期",
      "第二清单",
      "第一清单",
    ]);
    expect(groups.map((group) => group.tasks.map((item) => item.id))).toEqual([
      ["overdue-task"],
      ["project-b-task"],
      ["project-a-task"],
    ]);
  });

  it("does not create nodes for projects without today tasks", () => {
    const dates = [new Date(2026, 7, 13)];
    const groups = buildTimelineGroups([
      task("project-a-task", "project-a", new Date(2026, 7, 13, 10).toISOString()),
    ], dates, "project", projects);

    expect(groups.map((group) => group.title)).toEqual(["第一清单"]);
  });

  it("keeps undated and completed past tasks in their project nodes", () => {
    const dates = [new Date(2026, 7, 13)];
    const groups = buildTimelineGroups([
      task("undated-task", "project-b"),
      task("completed-past-task", "project-a", new Date(2026, 7, 12, 10).toISOString(), true),
    ], dates, "project", projects);

    expect(groups.map((group) => group.title)).toEqual(["第二清单", "第一清单"]);
    expect(groups.map((group) => group.tasks.map((item) => item.id))).toEqual([
      ["undated-task"],
      ["completed-past-task"],
    ]);
  });
});
