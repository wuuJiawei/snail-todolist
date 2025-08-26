import { useMemo } from "react";
import { Task } from "@/types/task";
import { TaskFilterOptions } from "@/components/tasks/TaskFilter";
import { isToday, isThisWeek, isPast, parseISO } from "date-fns";
import { useTaskContext } from "@/contexts/task";

export const useTaskFilter = (tasks: Task[] | { [key: string]: Task[] }, filters: TaskFilterOptions) => {
  const { getTaskTags } = useTaskContext();
  const filteredTasks = useMemo(() => {
    if (!tasks) return Array.isArray(tasks) ? [] : {};

    // 如果是按日期分组的任务对象
    if (!Array.isArray(tasks)) {
      const result: { [key: string]: Task[] } = {};
      Object.keys(tasks).forEach(dateKey => {
        const filteredDateTasks = tasks[dateKey].filter((task) => {
          return applyFilters(task, filters, getTaskTags);
        });
        if (filteredDateTasks.length > 0) {
          result[dateKey] = filteredDateTasks;
        }
      });
      return result;
    }

    // 如果是任务数组
    return tasks.filter((task) => {
      return applyFilters(task, filters, getTaskTags);
    });
  }, [tasks, filters, getTaskTags]);

  // 计算激活的筛选器数量
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status.length > 0) count++;
    if (filters.deadline.length > 0) count++;
    if (filters.hasAttachments !== null) count++;
    if ((filters.tags || []).length > 0) count++;
    return count;
  }, [filters]);

  return { filteredTasks, activeFilterCount };
};

// 应用筛选条件的辅助函数
const applyFilters = (task: Task, filters: TaskFilterOptions, getTaskTags: (taskId: string) => any[]): boolean => {
  // 状态筛选
  if (filters.status.length > 0) {
    const taskStatus = getTaskStatus(task);
    if (!filters.status.includes(taskStatus)) {
      return false;
    }
  }

  // 截止时间筛选
  if (filters.deadline.length > 0) {
    const deadlineCategory = getDeadlineCategory(task);
    if (!filters.deadline.includes(deadlineCategory)) {
      return false;
    }
  }

  // 附件筛选
  if (filters.hasAttachments !== null) {
    const hasAttachments = task.attachments && task.attachments.length > 0;
    if (filters.hasAttachments !== hasAttachments) {
      return false;
    }
  }

  // 标签筛选（包含任一标签）
  if ((filters.tags || []).length > 0) {
    const tags = getTaskTags(task.id) || [];
    const tagIds = new Set(tags.map((t: any) => t.id));
    const ok = (filters.tags || []).some(id => tagIds.has(id));
    if (!ok) return false;
  }

  return true;
};

// 获取任务状态
const getTaskStatus = (task: Task): string => {
  if (task.abandoned) return "abandoned";
  if (task.completed) return "completed";
  return "pending";
};

// 获取截止时间分类
const getDeadlineCategory = (task: Task): string => {
  if (!task.date) return "no-date";

  try {
    const deadline = parseISO(task.date);
    const now = new Date();

    if (isPast(deadline) && !isToday(deadline)) return "overdue";
    if (isToday(deadline)) return "today";
    if (isThisWeek(deadline)) return "week";
    
    return "future";
  } catch (error) {
    console.error("Error parsing task date:", error);
    return "no-date";
  }
};