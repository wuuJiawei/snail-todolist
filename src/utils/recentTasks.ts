import {
  addDays,
  endOfDay,
  isBefore,
  isValid,
  isWithinInterval,
  parseISO,
  startOfDay,
} from "date-fns";
import { Task } from "@/types/task";

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

  const taskDate = parseISO(task.date);
  if (!isValid(taskDate)) return false;

  const firstDay = startOfDay(referenceDate);
  const lastDay = endOfDay(addDays(firstDay, RECENT_AGENDA_DAY_COUNT - 1));

  if (!task.completed && isBefore(taskDate, firstDay)) return true;

  return isWithinInterval(taskDate, { start: firstDay, end: lastDay });
};
