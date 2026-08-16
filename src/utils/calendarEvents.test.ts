import { describe, expect, it } from "vitest";

import type { Task } from "@/types/task";

import {
  buildCalendarEvents,
  canMoveCalendarEvent,
  formatCalendarEventTime,
} from "./calendarEvents";

const task = (overrides: Partial<Task>): Task => ({
  id: "task-1",
  title: "测试任务",
  completed: false,
  ...overrides,
});

describe("calendar events", () => {
  it("keeps legacy tasks and date-only tasks in the all-day lane", () => {
    const legacyDate = new Date(2026, 7, 14);
    const events = buildCalendarEvents([
      task({ id: "legacy", date: legacyDate.toISOString() }),
      task({ id: "date-only", date: legacyDate.toISOString(), date_type: "date" }),
    ]);

    expect(events).toHaveLength(2);
    expect(events.map((event) => ({ id: event.id, start: event.start, allDay: event.allDay }))).toEqual([
      { id: "legacy", start: "2026-08-14", allDay: true },
      { id: "date-only", start: "2026-08-14", allDay: true },
    ]);
  });

  it("places datetime tasks at their exact time", () => {
    const start = new Date(2026, 7, 14, 9, 35);
    const [event] = buildCalendarEvents([
      task({ date: start.toISOString(), date_type: "datetime" }),
    ]);

    expect(event.start).toEqual(start);
    expect(event.end).toBeUndefined();
    expect(event.allDay).toBe(false);
  });

  it("keeps the exact start and end of time ranges", () => {
    const start = new Date(2026, 7, 14, 23, 30);
    const end = new Date(2026, 7, 15, 1);
    const [event] = buildCalendarEvents([
      task({ date: start.toISOString(), date_type: "range", end_date: end.toISOString() }),
    ]);

    expect(event.start).toEqual(start);
    expect(event.end).toEqual(end);
    expect(event.allDay).toBe(false);
    expect(event.durationEditable).toBe(true);
  });

  it("formats task time from domain data instead of calendar-rendered segments", () => {
    expect(formatCalendarEventTime(task({
      date: new Date(2026, 7, 14, 9, 35).toISOString(),
      date_type: "datetime",
    }))).toBe("09:35");
    expect(formatCalendarEventTime(task({
      date: new Date(2026, 7, 14, 9, 35).toISOString(),
      date_type: "range",
      end_date: new Date(2026, 7, 14, 10, 20).toISOString(),
    }))).toBe("09:35–10:20");
    expect(formatCalendarEventTime(task({
      date: new Date(2026, 7, 14, 23, 30).toISOString(),
      date_type: "range",
      end_date: new Date(2026, 7, 15, 1).toISOString(),
    }))).toBe("8月14日 23:30–8月15日 01:00");
    expect(formatCalendarEventTime(task({
      date: new Date(2026, 7, 14).toISOString(),
    }))).toBe("");
  });

  it("ignores tasks without a date instead of creating invalid events", () => {
    expect(buildCalendarEvents([task({ date: undefined })])).toEqual([]);
  });

  it("does not silently change date-only and timed task semantics while dragging", () => {
    const dateOnly = task({ date: new Date(2026, 7, 14).toISOString() });
    const timed = task({ date: new Date(2026, 7, 14, 9).toISOString(), date_type: "datetime" });

    expect(canMoveCalendarEvent(dateOnly, true)).toBe(true);
    expect(canMoveCalendarEvent(dateOnly, false)).toBe(false);
    expect(canMoveCalendarEvent(timed, false)).toBe(true);
    expect(canMoveCalendarEvent(timed, true)).toBe(false);
  });
});
