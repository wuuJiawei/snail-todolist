import {
  endOfDay,
  format,
  isSameDay,
  isToday,
  isTomorrow,
  isValid,
  isYesterday,
  parseISO,
  startOfDay,
} from "date-fns";
import { zhCN } from "date-fns/locale";

import type { Task, TaskDateType } from "@/types/task";

export type TaskDateValue =
  | { type: "date"; start: Date }
  | { type: "datetime"; start: Date }
  | { type: "range"; start: Date; end: Date }
  | undefined;

export const getTaskDateType = (task: Pick<Task, "date" | "date_type" | "end_date">): TaskDateType => {
  if (task.date_type === "range" && task.end_date) return "range";
  if (task.date_type === "datetime") return "datetime";
  return "date";
};

export const parseTaskDate = (value?: string): Date | undefined => {
  if (!value) return undefined;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : undefined;
};

export const toTaskDateValue = (task: Pick<Task, "date" | "date_type" | "end_date">): TaskDateValue => {
  const start = parseTaskDate(task.date);
  if (!start) return undefined;

  const type = getTaskDateType(task);
  if (type === "range") {
    const end = parseTaskDate(task.end_date);
    if (end && end > start) return { type, start, end };
  }
  return type === "datetime" ? { type, start } : { type: "date", start };
};

export const serializeTaskDateValue = (
  value: TaskDateValue,
): Pick<Task, "date" | "date_type" | "end_date"> => {
  if (!value) return { date: undefined, date_type: "date", end_date: undefined };
  if (value.type === "date") {
    return { date: startOfDay(value.start).toISOString(), date_type: "date", end_date: undefined };
  }
  if (value.type === "datetime") {
    return { date: value.start.toISOString(), date_type: "datetime", end_date: undefined };
  }
  return {
    date: value.start.toISOString(),
    date_type: "range",
    end_date: value.end.toISOString(),
  };
};

export const getTaskEffectiveDeadline = (
  task: Pick<Task, "date" | "date_type" | "end_date">,
): Date | undefined => {
  const value = toTaskDateValue(task);
  if (!value) return undefined;
  if (value.type === "date") return endOfDay(value.start);
  if (value.type === "range") return value.end;
  return value.start;
};

export const isTaskDateExpired = (
  task: Pick<Task, "completed" | "date" | "date_type" | "end_date">,
  now = new Date(),
) => {
  if (task.completed) return false;
  const deadline = getTaskEffectiveDeadline(task);
  return deadline ? deadline < now : false;
};

export const isTaskOnDate = (
  task: Pick<Task, "date" | "date_type" | "end_date">,
  date: Date,
) => {
  const value = toTaskDateValue(task);
  if (!value) return false;
  if (value.type !== "range") return isSameDay(value.start, date);
  return value.start <= endOfDay(date) && value.end >= startOfDay(date);
};

export const isTaskWithinDateRange = (
  task: Pick<Task, "date" | "date_type" | "end_date">,
  from: Date,
  to: Date,
) => {
  const value = toTaskDateValue(task);
  if (!value) return false;
  const rangeStart = startOfDay(from);
  const rangeEnd = endOfDay(to);
  if (value.type !== "range") return value.start >= rangeStart && value.start <= rangeEnd;
  return value.start <= rangeEnd && value.end >= rangeStart;
};

const formatDay = (date: Date) => {
  if (isToday(date)) return "今天";
  if (isTomorrow(date)) return "明天";
  if (isYesterday(date)) return "昨天";
  return format(date, "M月d日", { locale: zhCN });
};

export const formatTaskDateValue = (value: TaskDateValue) => {
  if (!value) return "添加时间";
  if (value.type === "date") return formatDay(value.start);
  if (value.type === "datetime") return `${formatDay(value.start)} ${format(value.start, "HH:mm")}`;
  if (isSameDay(value.start, value.end)) {
    return `${formatDay(value.start)} ${format(value.start, "HH:mm")}–${format(value.end, "HH:mm")}`;
  }
  return `${formatDay(value.start)} ${format(value.start, "HH:mm")}–${formatDay(value.end)} ${format(value.end, "HH:mm")}`;
};

export const formatTaskDate = (task: Pick<Task, "date" | "date_type" | "end_date">) =>
  formatTaskDateValue(toTaskDateValue(task));
