import {
  addDays,
  endOfDay,
  startOfDay,
} from "date-fns";
import { Task } from "@/types/task";
import { isTaskDateExpired, isTaskWithinDateRange } from "@/utils/taskDate";

export const RECENT_AGENDA_DAY_COUNT = 7;

export const getRecentAgendaDates = (referenceDate = new Date()) => {
  const firstDay = startOfDay(referenceDate);
  return Array.from(
    { length: RECENT_AGENDA_DAY_COUNT },
    (_, index) => addDays(firstDay, index),
  );
};

export const isTaskInRecentAgenda = (task: Task, referenceDate = new Date()) => {
  if (!task.date) return false;

  const firstDay = startOfDay(referenceDate);
  const lastDay = endOfDay(addDays(firstDay, RECENT_AGENDA_DAY_COUNT - 1));

  if (isTaskDateExpired(task, firstDay)) return true;

  return isTaskWithinDateRange(task, firstDay, lastDay);
};
