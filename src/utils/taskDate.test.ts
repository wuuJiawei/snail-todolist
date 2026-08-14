import { describe, expect, it } from "vitest";

import {
  getTaskEffectiveDeadline,
  isTaskDateExpired,
  isTaskOnDate,
  serializeTaskDateValue,
  toTaskDateValue,
} from "./taskDate";

describe("task date utilities", () => {
  it("keeps legacy dates as date-only values", () => {
    const value = toTaskDateValue({ date: "2026-08-14T00:00:00.000Z" });
    expect(value?.type).toBe("date");
  });

  it("serializes a range with its end time", () => {
    const start = new Date("2026-08-14T09:00:00.000Z");
    const end = new Date("2026-08-14T10:30:00.000Z");
    expect(serializeTaskDateValue({ type: "range", start, end })).toEqual({
      date: start.toISOString(),
      date_type: "range",
      end_date: end.toISOString(),
    });
  });

  it("uses the range end as the effective deadline", () => {
    const deadline = getTaskEffectiveDeadline({
      date: "2026-08-14T09:00:00.000Z",
      date_type: "range",
      end_date: "2026-08-14T10:30:00.000Z",
    });
    expect(deadline?.toISOString()).toBe("2026-08-14T10:30:00.000Z");
  });

  it("does not expire a date-only task until the local day has ended", () => {
    const date = new Date(2026, 7, 14);
    expect(isTaskDateExpired({
      completed: false,
      ...serializeTaskDateValue({ type: "date", start: date }),
    }, new Date(2026, 7, 14, 18))).toBe(false);
  });

  it("includes every local day touched by a time range", () => {
    const task = {
      date: new Date(2026, 7, 14, 23).toISOString(),
      date_type: "range" as const,
      end_date: new Date(2026, 7, 15, 1).toISOString(),
    };
    expect(isTaskOnDate(task, new Date(2026, 7, 14, 12))).toBe(true);
    expect(isTaskOnDate(task, new Date(2026, 7, 15, 12))).toBe(true);
  });
});
