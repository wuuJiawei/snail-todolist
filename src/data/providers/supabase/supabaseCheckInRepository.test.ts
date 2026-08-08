import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { calculateCheckInStreak, SupabaseCheckInRepository } from "./supabaseCheckInRepository";

describe("calculateCheckInStreak", () => {
  it("counts unique consecutive local calendar days", () => {
    const now = new Date(2026, 7, 5, 12);
    const times = [
      new Date(2026, 7, 5, 8).toISOString(),
      new Date(2026, 7, 5, 18).toISOString(),
      new Date(2026, 7, 4, 10).toISOString(),
      new Date(2026, 7, 3, 10).toISOString(),
      new Date(2026, 7, 1, 10).toISOString(),
    ];
    expect(calculateCheckInStreak(times, now)).toBe(3);
  });

  it("returns zero when the most recent check-in is older than yesterday", () => {
    const now = new Date(2026, 7, 5, 12);
    expect(calculateCheckInStreak([new Date(2026, 7, 3, 10).toISOString()], now)).toBe(0);
  });
});

describe("SupabaseCheckInRepository", () => {
  it("returns the persisted check-in record instead of a generated placeholder", async () => {
    const statusQuery = { select: vi.fn(), eq: vi.fn(), gte: vi.fn(), lte: vi.fn() };
    statusQuery.select.mockReturnValue(statusQuery);
    statusQuery.eq.mockReturnValue(statusQuery);
    statusQuery.gte.mockReturnValue(statusQuery);
    statusQuery.lte.mockResolvedValue({ data: [], error: null });

    const createdRow = {
      id: "check-in-1",
      user_id: "user-1",
      check_in_time: "2026-08-05T04:00:00.000Z",
      created_at: "2026-08-05T04:00:00.000Z",
      note: "Ready",
    };
    const insertQuery = { insert: vi.fn(), select: vi.fn(), single: vi.fn() };
    insertQuery.insert.mockReturnValue(insertQuery);
    insertQuery.select.mockReturnValue(insertQuery);
    insertQuery.single.mockResolvedValue({ data: createdRow, error: null });

    const client = {
      auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: "user-1" } } }, error: null }) },
      from: vi.fn()
        .mockReturnValueOnce(statusQuery)
        .mockReturnValueOnce(insertQuery),
    } as unknown as SupabaseClient<Database>;
    const repository = new SupabaseCheckInRepository(client);

    await expect(repository.create(" Ready ")).resolves.toEqual({
      id: "check-in-1",
      checkInTime: createdRow.check_in_time,
      createdAt: createdRow.created_at,
      note: "Ready",
    });
    expect(insertQuery.insert).toHaveBeenCalledWith(expect.objectContaining({ note: "Ready", user_id: "user-1" }));
  });

  it("loads paged history and exact total in one data query", async () => {
    const row = {
      id: "check-in-1",
      user_id: "user-1",
      check_in_time: "2026-08-05T04:00:00.000Z",
      created_at: "2026-08-05T04:00:00.000Z",
      note: null,
    };
    const query = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), range: vi.fn() };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.order.mockReturnValue(query);
    query.range.mockResolvedValue({ data: [row], count: 12, error: null });
    const from = vi.fn(() => query);
    const client = {
      auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: "user-1" } } }, error: null }) },
      from,
    } as unknown as SupabaseClient<Database>;
    const repository = new SupabaseCheckInRepository(client);

    await expect(repository.findHistory(2, 10)).resolves.toEqual({
      records: [{ id: "check-in-1", checkInTime: row.check_in_time, createdAt: row.created_at, note: null }],
      total: 12,
    });
    expect(query.select).toHaveBeenCalledWith("*", { count: "exact" });
    expect(query.range).toHaveBeenCalledWith(10, 19);
    expect(from).toHaveBeenCalledTimes(1);
  });

  it("loads only check-ins inside the requested calendar range", async () => {
    const row = {
      id: "check-in-1",
      user_id: "user-1",
      check_in_time: "2026-08-08T04:00:00.000Z",
      created_at: "2026-08-08T04:00:00.000Z",
      note: null,
    };
    const query = { select: vi.fn(), eq: vi.fn(), gte: vi.fn(), lte: vi.fn(), order: vi.fn() };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.gte.mockReturnValue(query);
    query.lte.mockReturnValue(query);
    query.order.mockResolvedValue({ data: [row], error: null });
    const client = {
      auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: "user-1" } } }, error: null }) },
      from: vi.fn(() => query),
    } as unknown as SupabaseClient<Database>;
    const repository = new SupabaseCheckInRepository(client);
    const fromIso = "2026-07-31T16:00:00.000Z";
    const toIso = "2026-08-31T15:59:59.999Z";

    await expect(repository.findByRange(fromIso, toIso)).resolves.toEqual([
      { id: "check-in-1", checkInTime: row.check_in_time, createdAt: row.created_at, note: null },
    ]);
    expect(query.gte).toHaveBeenCalledWith("check_in_time", fromIso);
    expect(query.lte).toHaveBeenCalledWith("check_in_time", toIso);
    expect(query.order).toHaveBeenCalledWith("check_in_time", { ascending: true });
  });
});
