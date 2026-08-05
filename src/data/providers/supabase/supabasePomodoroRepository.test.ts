import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { calculatePomodoroStats, SupabasePomodoroRepository } from "./supabasePomodoroRepository";

const row = {
  id: "session-1",
  user_id: "user-1",
  task_id: "task-1",
  start_time: "2026-08-05T01:00:00.000Z",
  end_time: "2026-08-05T01:25:00.000Z",
  duration: 30,
  type: "focus",
  completed: true,
  created_at: "2026-08-05T01:00:00.000Z",
  title: "Deep work",
};

describe("SupabasePomodoroRepository", () => {
  it("applies contract filters and maps rows to domain sessions", async () => {
    const query = {
      select: vi.fn(), eq: vi.fn(), gte: vi.fn(), lte: vi.fn(), order: vi.fn(), limit: vi.fn(),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.gte.mockReturnValue(query);
    query.lte.mockReturnValue(query);
    query.order.mockReturnValue(query);
    query.limit.mockResolvedValue({ data: [row], error: null });
    const client = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }) },
      from: vi.fn(() => query),
    } as unknown as SupabaseClient<Database>;
    const repository = new SupabasePomodoroRepository(client);

    await expect(repository.findAll({
      taskId: "task-1",
      from: "2026-08-01T00:00:00.000Z",
      to: "2026-08-31T23:59:59.999Z",
      limit: 10,
    })).resolves.toEqual([{
      id: "session-1",
      userId: "user-1",
      taskId: "task-1",
      startTime: row.start_time,
      endTime: row.end_time,
      duration: 30,
      type: "focus",
      completed: true,
      createdAt: row.created_at,
      title: "Deep work",
    }]);
    expect(query.eq).toHaveBeenCalledWith("task_id", "task-1");
    expect(query.gte).toHaveBeenCalledWith("start_time", "2026-08-01T00:00:00.000Z");
    expect(query.lte).toHaveBeenCalledWith("start_time", "2026-08-31T23:59:59.999Z");
    expect(query.limit).toHaveBeenCalledWith(10);
  });

  it("persists cancellation as an ended, incomplete session", async () => {
    const query = { update: vi.fn(), eq: vi.fn(), select: vi.fn(), maybeSingle: vi.fn() };
    query.update.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.select.mockReturnValue(query);
    query.maybeSingle.mockResolvedValue({ data: { ...row, completed: false }, error: null });
    const client = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }) },
      from: vi.fn(() => query),
    } as unknown as SupabaseClient<Database>;
    const repository = new SupabasePomodoroRepository(client);

    await repository.complete("session-1", { completed: false });
    expect(query.update).toHaveBeenCalledWith(expect.objectContaining({
      completed: false,
      end_time: expect.any(String),
    }));
  });
});

describe("calculatePomodoroStats", () => {
  it("uses actual elapsed minutes and ignores incomplete sessions", () => {
    expect(calculatePomodoroStats([
      {
        id: "focus", startTime: "2026-08-05T01:00:00.000Z", endTime: "2026-08-05T01:25:00.000Z",
        duration: 30, type: "focus", completed: true,
      },
      {
        id: "break", startTime: "2026-08-05T02:00:00.000Z", endTime: "2026-08-05T02:05:00.000Z",
        duration: 10, type: "short_break", completed: true,
      },
      {
        id: "active", startTime: "2026-08-05T03:00:00.000Z", endTime: null,
        duration: 30, type: "focus", completed: false,
      },
    ])).toEqual({
      focusMinutes: 25,
      breakMinutes: 5,
      completedFocusSessions: 1,
      completedBreakSessions: 1,
    });
  });
});
