import { Task } from "@/types/task";
import { format, isToday, isTomorrow, isYesterday, isValid } from "date-fns";
import { zhCN } from "date-fns/locale";
import { SELECTED_PROJECT_KEY } from "./types";

// Get the saved project from localStorage
export const getSavedProject = (): string => {
  return localStorage.getItem(SELECTED_PROJECT_KEY) || "today";
};

// Format date for display in a user-friendly way
export const formatDateText = (date: Date | undefined) => {
  if (!date) return "添加日期";
  
  if (isToday(date)) return "今天";
  if (isTomorrow(date)) return "明天";
  if (isYesterday(date)) return "昨天";
  
  return format(date, "M月d日", { locale: zhCN });
};

// Calculate task count for a specific project
export const getProjectTaskCount = (tasks: Task[], projectId: string): number => {
  if (projectId === "recent") {
    // For "recent" project, count tasks with dates in the last 7 days
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    return tasks.filter(task => {
      if (!task.date || task.completed) return false;
      
      try {
        const taskDate = new Date(task.date);
        return isValid(taskDate) && taskDate >= weekAgo && taskDate <= today;
      } catch (e) {
        return false;
      }
    }).length;
  } else if (projectId === "today") {
    // For "today" project, count tasks with today's date
    return tasks.filter(task => {
      if (!task.date || task.completed) return false;
      
      try {
        const taskDate = new Date(task.date);
        return isValid(taskDate) && isToday(taskDate);
      } catch (e) {
        return false;
      }
    }).length;
  } else if (projectId === "completed") {
    // For "completed" project, count completed tasks
    return tasks.filter(task => task.completed).length;
  } else if (projectId === "flagged") {
    return tasks.filter(task => task.flagged && !task.completed && !task.deleted && !task.abandoned).length;
  } else if (projectId === "trash") {
    // For "trash" project - currently no actual deleted tasks are stored
    return 0;
  } else {
    // For regular projects, count tasks with matching project ID
    return tasks.filter(task => task.project === projectId && !task.completed).length;
  }
};

// Check if a task is expired (past date and not completed)
export const isTaskExpired = (task: Task) => {
  if (task.completed) return false;
  if (!task.date) return false;
  
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Reset time to start of day
  
  try {
    const taskDate = new Date(task.date);
    return isValid(taskDate) && taskDate < now;
  } catch (e) {
    return false;
  }
};

// Group tasks by their completion status and date
export const groupTasksByDateAndStatus = (tasks: Task[]) => {
  const expired: Task[] = [];
  const pending: Record<string, Task[]> = {};
  const completed: Task[] = [];
  
  tasks.forEach(task => {
    if (task.completed) {
      completed.push(task);
    } else if (isTaskExpired(task)) {
      expired.push(task);
    } else {
      // Group by date
      let dateKey = "无日期";
      if (task.date) {
        try {
          const taskDate = new Date(task.date);
          if (isValid(taskDate)) {
            if (isToday(taskDate)) {
              dateKey = "今天";
            } else if (isTomorrow(taskDate)) {
              dateKey = "明天";
            } else {
              dateKey = format(taskDate, "M月d日", { locale: zhCN });
            }
          }
        } catch (e) {
          // If date parsing fails, use "无日期"
        }
      }
      
      if (!pending[dateKey]) {
        pending[dateKey] = [];
      }
      pending[dateKey].push(task);
    }
  });
  
  // Sort completed tasks by date (newest first)
  completed.sort((a, b) => {
    const dateA = a.completed_at ? new Date(a.completed_at) : new Date(0);
    const dateB = b.completed_at ? new Date(b.completed_at) : new Date(0);
    return dateB.getTime() - dateA.getTime();
  });
  
  // Get sorted date keys for pending tasks
  const dateOrder = ["今天", "明天", "无日期"];
  const otherDates = Object.keys(pending).filter(date => !dateOrder.includes(date));
  
  // Sort other dates
  otherDates.sort((a, b) => {
    // Parse dates and sort them
    const getDateValue = (dateStr: string): number => {
      const match = dateStr.match(/(\d+)月(\d+)日/);
      if (match) {
        const month = parseInt(match[1]);
        const day = parseInt(match[2]);
        return month * 100 + day; // Simple numeric value for comparison
      }
      return 0;
    };
    
    return getDateValue(a) - getDateValue(b); // Ascending order
  });
  
  // Combine all sorted dates
  const sortedDates = [...dateOrder, ...otherDates];
  
  // Create a new object with sorted dates
  const pendingTasksByDate: Record<string, Task[]> = {};
  for (const date of sortedDates) {
    if (pending[date]) {
      pendingTasksByDate[date] = pending[date];
    }
  }
  
  return {
    expiredTasks: expired,
    pendingTasksByDate,
    completedTasks: completed,
    pendingTasks: Object.values(pendingTasksByDate).flat()
  };
};
