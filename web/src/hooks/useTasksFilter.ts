import { useMemo } from "react";
import { Task } from "@/types/task";
import { isToday, isValid } from "date-fns";
import { groupTasksByDateAndStatus } from "@/utils/taskUtils";

// Define the return type for better type safety
interface TasksFilterResult {
  projectTasks: Task[];
  expiredTasks: Task[];
  pendingTasksByDate: Record<string, Task[]>;
  completedTasks: Task[];
  pendingTasks: Task[];
  isSpecialView: boolean;
}

export const useTasksFilter = (
  tasks: Task[],
  selectedProject: string,
  filteredProjects: string[] = []
): TasksFilterResult => {
  // Get tasks based on the selected project
  const projectTasks = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);

    if (selectedProject === "recent") {
      return tasks.filter(task => {
        if (!task.date) return false;

        // Apply project filter if specified
        if (filteredProjects.length > 0 && !filteredProjects.includes(task.project || "")) {
          return false;
        }

        const taskDate = new Date(task.date);
        if (!isValid(taskDate)) return false;

        const isWithinLastWeek = taskDate >= weekAgo && taskDate <= now;
        const isOverdue = !task.completed && taskDate < now;

        return isWithinLastWeek || isOverdue;
      });
    } else if (selectedProject === "today") {
      // For the "today" project, get tasks for today from all projects
      // AND all expired tasks (past dates that are not completed)
      return tasks.filter(task => {
        if (!task.date) return false;

        // Apply project filter if specified
        if (filteredProjects.length > 0 && !filteredProjects.includes(task.project || "")) {
          return false;
        }

        const taskDate = new Date(task.date);
        if (!isValid(taskDate)) return false;

        // Include today's tasks
        if (isToday(taskDate)) return true;

        // Include all expired tasks that are not completed
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Beginning of today

        return !task.completed && taskDate < today;
      });
    } else if (selectedProject === "flagged") {
      return tasks.filter(task => {
        if (!task.flagged) return false;

        if (filteredProjects.length > 0) {
          const targetProject = task.project || "";
          if (!targetProject || !filteredProjects.includes(targetProject)) {
            return false;
          }
        }

        return true;
      });
    } else {
      // For regular projects, filter by project ID
      return tasks.filter(task => task.project === selectedProject);
    }
  }, [tasks, selectedProject, filteredProjects]);

  // Check if this is a special view that should use date-based grouping
  const isSpecialView = selectedProject === "recent" || selectedProject === "today" || selectedProject === "flagged";

  // Group and sort tasks by status and date if needed
  const groupedTasks = useMemo(() => {
    if (isSpecialView) {
      const result = groupTasksByDateAndStatus(projectTasks);

      // Ensure pendingTasks is included
      // This represents all non-completed tasks (for consistency with regular view)
      const pendingTasks = projectTasks.filter(task => !task.completed);

      return {
        ...result,
        pendingTasks
      };
    } else {
      // For regular projects, just split by completion status
      const pendingTasks = projectTasks.filter(task => !task.completed);
      const completedTasks = projectTasks.filter(task => task.completed);

      // Sort completed tasks by completion time (newest first)
      completedTasks.sort((a, b) => {
        const dateA = a.completed_at ? new Date(a.completed_at) : new Date(0);
        const dateB = b.completed_at ? new Date(b.completed_at) : new Date(0);
        return dateB.getTime() - dateA.getTime();
      });

      return {
        expiredTasks: [],
        pendingTasksByDate: {},
        completedTasks,
        pendingTasks
      };
    }
  }, [projectTasks, isSpecialView]);

  return {
    projectTasks,
    ...groupedTasks,
    isSpecialView
  };
};
