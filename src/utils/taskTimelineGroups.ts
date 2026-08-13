import { format, isBefore, isValid, parseISO, startOfDay } from "date-fns";

import type { Project } from "@/types/project";
import type { Task } from "@/types/task";

export type TimelineGrouping = "date" | "project";

export interface TimelineGroup {
  key: string;
  date?: Date;
  title?: string;
  tasks: Task[];
  overdue?: boolean;
}

const OVERDUE_KEY = "overdue";
const UNASSIGNED_PROJECT_KEY = "unassigned";

export const buildTimelineGroups = (
  tasks: Task[],
  dates: Date[],
  grouping: TimelineGrouping,
  projects: Project[] = [],
): TimelineGroup[] => {
  const today = startOfDay(dates[0]);
  const grouped = new Map<string, Task[]>();

  tasks.forEach((task) => {
    const taskDate = task.date ? parseISO(task.date) : undefined;
    const hasValidDate = taskDate ? isValid(taskDate) : false;

    if (grouping === "date" && (!taskDate || !hasValidDate)) return;

    const isOverdue = taskDate && hasValidDate && !task.completed && isBefore(taskDate, today);
    const key = isOverdue
      ? OVERDUE_KEY
      : grouping === "project"
        ? task.project || UNASSIGNED_PROJECT_KEY
        : format(taskDate as Date, "yyyy-MM-dd");
    grouped.set(key, [...(grouped.get(key) ?? []), task]);
  });

  const sortTasks = (items: Task[]) => [...items].sort((a, b) =>
    Date.parse(a.date ?? "") - Date.parse(b.date ?? ""),
  );
  const result: TimelineGroup[] = [];
  const overdueTasks = grouped.get(OVERDUE_KEY);

  if (overdueTasks?.length) {
    result.push({ key: OVERDUE_KEY, tasks: sortTasks(overdueTasks), overdue: true });
  }

  if (grouping === "project") {
    const knownProjectIds = new Set(projects.map((project) => project.id));
    projects.forEach((project) => {
      const projectTasks = grouped.get(project.id);
      if (projectTasks?.length) {
        result.push({
          key: `project-${project.id}`,
          title: project.name,
          tasks: sortTasks(projectTasks),
        });
      }
    });

    grouped.forEach((projectTasks, projectId) => {
      if (projectId === OVERDUE_KEY || knownProjectIds.has(projectId)) return;
      result.push({
        key: `project-${projectId}`,
        title: projectId === UNASSIGNED_PROJECT_KEY ? "未归属清单" : "未知清单",
        tasks: sortTasks(projectTasks),
      });
    });

    return result;
  }

  dates.forEach((date) => {
    const key = format(date, "yyyy-MM-dd");
    const dateTasks = grouped.get(key);
    if (dateTasks?.length) result.push({ key, date, tasks: sortTasks(dateTasks) });
  });

  return result;
};
