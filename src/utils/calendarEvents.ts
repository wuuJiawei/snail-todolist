import type { EventInput } from "@fullcalendar/react";
import { format, isSameDay } from "date-fns";

import type { Task } from "@/types/task";
import { toTaskDateValue } from "@/utils/taskDate";

export const buildCalendarEvents = (tasks: Task[]): EventInput[] => tasks.flatMap((task) => {
  const value = toTaskDateValue(task);
  if (!value) return [];

  const allDay = value.type === "date";
  return [{
    id: task.id,
    title: task.title,
    start: allDay ? format(value.start, "yyyy-MM-dd") : value.start,
    end: value.type === "range" ? value.end : undefined,
    allDay,
    editable: true,
    durationEditable: value.type === "range",
    extendedProps: { taskId: task.id },
  }];
});

export const formatCalendarEventTime = (
  task: Pick<Task, "date" | "date_type" | "end_date">,
) => {
  const value = toTaskDateValue(task);
  if (!value || value.type === "date") return "";
  if (value.type === "datetime") return format(value.start, "HH:mm");
  if (isSameDay(value.start, value.end)) {
    return `${format(value.start, "HH:mm")}–${format(value.end, "HH:mm")}`;
  }
  return `${format(value.start, "M月d日 HH:mm")}–${format(value.end, "M月d日 HH:mm")}`;
};

export const canMoveCalendarEvent = (
  task: Pick<Task, "date" | "date_type" | "end_date">,
  targetAllDay: boolean,
) => {
  const value = toTaskDateValue(task);
  return Boolean(value) && targetAllDay === (value?.type === "date");
};
