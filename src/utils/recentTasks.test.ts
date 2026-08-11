import { describe, expect, it } from "vitest";
import { format } from "date-fns";
import { getRecentAgendaDates, isTaskInRecentAgenda } from "./recentTasks";
import { Task } from "@/types/task";

const referenceDate = new Date(2026, 7, 11, 12);
const dateAt = (day: number, hour = 12) => new Date(2026, 7, day, hour).toISOString();
const createTask = (date: string, completed = false): Task => ({
  id: date,
  title: date,
  completed,
  date,
});

describe("recentTasks", () => {
  it("returns today and the following six calendar days", () => {
    const dates = getRecentAgendaDates(referenceDate);

    expect(dates).toHaveLength(7);
    expect(format(dates[0], "yyyy-MM-dd")).toBe("2026-08-11");
    expect(format(dates[6], "yyyy-MM-dd")).toBe("2026-08-17");
  });

  it("includes overdue pending tasks and tasks due in the seven-day agenda", () => {
    expect(isTaskInRecentAgenda(createTask(dateAt(10)), referenceDate)).toBe(true);
    expect(isTaskInRecentAgenda(createTask(dateAt(11)), referenceDate)).toBe(true);
    expect(isTaskInRecentAgenda(createTask(dateAt(17, 18)), referenceDate)).toBe(true);
  });

  it("excludes completed overdue tasks and dates outside the agenda", () => {
    expect(isTaskInRecentAgenda(createTask(dateAt(10), true), referenceDate)).toBe(false);
    expect(isTaskInRecentAgenda(createTask(dateAt(18)), referenceDate)).toBe(false);
    expect(isTaskInRecentAgenda(createTask("invalid"), referenceDate)).toBe(false);
  });
});
