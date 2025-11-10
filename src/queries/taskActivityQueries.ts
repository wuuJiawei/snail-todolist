import { queryOptions } from "@tanstack/react-query";
import { fetchTaskActivities } from "@/services/taskActivityService";
import type { TaskActivity } from "@/types/taskActivity";

export const taskActivityKeys = {
  all: ["task-activities"] as const,
  byTask: (taskId: string) => [...taskActivityKeys.all, taskId] as const,
};

export const taskActivityQueries = {
  byTask: (taskId: string) =>
    queryOptions<TaskActivity[]>({
      queryKey: taskActivityKeys.byTask(taskId),
      queryFn: () => fetchTaskActivities(taskId),
      staleTime: 1000 * 60,
    }),
};
