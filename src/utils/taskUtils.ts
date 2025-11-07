import { Task } from "@/types/task";
import { format, isToday, isTomorrow, isYesterday, isValid } from "date-fns";
import { zhCN } from "date-fns/locale";

// Format date for display in a user-friendly way
export const formatDateText = (date: Date | undefined) => {
  if (!date) return "添加日期";
  
  if (isToday(date)) return "今天";
  if (isTomorrow(date)) return "明天";
  if (isYesterday(date)) return "昨天";
  
  return format(date, "M月d日", { locale: zhCN });
};

// Check if a task is expired (past date and not completed)
export const isTaskExpired = (task: Task) => {
  if (task.completed) return false;
  if (!task.date) return false;
  
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Reset time to start of day
  
  const taskDate = new Date(task.date);
  return isValid(taskDate) && taskDate < now;
};

// Define the return type for the grouping function
interface GroupedTasks {
  expiredTasks: Task[];
  pendingTasksByDate: Record<string, Task[]>;
  completedTasks: Task[];
  // Note: pendingTasks is not included here but will be added in useTasksFilter
}

// Group tasks by their completion status and date
export const groupTasksByDateAndStatus = (tasks: Task[]): GroupedTasks => {
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
  const dateOrder = ["明天", "今天", "无日期"];
  const otherDates = Object.keys(pending).filter(date => !dateOrder.includes(date));
  
  // Sort other dates
  otherDates.sort((a, b) => {
    const getDateValue = (dateStr: string): number => {
      const match = dateStr.match(/(\d+)月(\d+)日/);
      if (match) {
        const month = parseInt(match[1]);
        const day = parseInt(match[2]);
        return month * 100 + day;
      }
      return 0;
    };

    return getDateValue(b) - getDateValue(a);
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
  
  return { expiredTasks: expired, pendingTasksByDate, completedTasks: completed };
};
