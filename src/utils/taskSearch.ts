import type { Task } from "@/types/task";

export const normalizeTaskSearchQuery = (query: string) => query.trim().toLocaleLowerCase();

export const matchesTaskSearch = (task: Task, query: string) => {
  const normalizedQuery = normalizeTaskSearchQuery(query);
  if (!normalizedQuery) return true;

  return task.title.toLocaleLowerCase().includes(normalizedQuery);
};

export const filterTasksBySearch = (tasks: Task[], query: string) => {
  const normalizedQuery = normalizeTaskSearchQuery(query);
  if (!normalizedQuery) return tasks;

  return tasks.filter((task) => task.title.toLocaleLowerCase().includes(normalizedQuery));
};
