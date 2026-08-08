import type { CheckInRepository, CheckInRecord } from "@/data/contracts/checkInRepository";
import { DataError } from "@/data/contracts/errors";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "./client";
import type { Database } from "./database.types";
import { withSupabaseError } from "./mapSupabaseError";
import { getSessionUserId } from "./authIdentity";

type CheckInRow = Database["public"]["Tables"]["checkin_records"]["Row"];

const DAY_MS = 24 * 60 * 60 * 1000;

const getTodayBounds = (now = new Date()) => ({
  startIso: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString(),
  endIso: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString(),
});

const localDayNumber = (value: Date) => Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()) / DAY_MS;

export function calculateCheckInStreak(checkInTimes: string[], now = new Date()): number {
  const days = Array.from(new Set(checkInTimes
    .map((value) => new Date(value))
    .filter((value) => !Number.isNaN(value.getTime()))
    .map(localDayNumber)))
    .sort((left, right) => right - left);
  if (days.length === 0) return 0;

  const today = localDayNumber(now);
  if (today - days[0] > 1) return 0;

  let streak = 1;
  for (let index = 0; index < days.length - 1; index += 1) {
    if (days[index] - days[index + 1] !== 1) break;
    streak += 1;
  }
  return streak;
}

const mapRow = (row: CheckInRow): CheckInRecord => {
  const timestamp = row.check_in_time ?? row.created_at;
  if (!timestamp) throw new DataError("VALIDATION", "打卡记录缺少时间");
  return {
    id: row.id,
    checkInTime: timestamp,
    note: row.note,
    createdAt: row.created_at ?? timestamp,
  };
};

export class SupabaseCheckInRepository implements CheckInRepository {
  constructor(private readonly client: SupabaseClient<Database> = supabase) {}

  private async hasCheckedIn(userId: string, now = new Date()): Promise<boolean> {
    const { startIso, endIso } = getTodayBounds(now);
    const { data, error } = await this.client
      .from("checkin_records")
      .select("id")
      .eq("user_id", userId)
      .gte("check_in_time", startIso)
      .lte("check_in_time", endIso);
    if (error) throw error;
    return (data?.length ?? 0) > 0;
  }

  hasCheckedInToday() {
    return withSupabaseError(async () => {
      const userId = await getSessionUserId(this.client);
      return userId ? this.hasCheckedIn(userId) : false;
    });
  }

  create(note?: string) {
    return withSupabaseError(async () => {
      const userId = await getSessionUserId(this.client);
      if (!userId) throw new DataError("AUTH_REQUIRED", "请先登录后再打卡");
      if (await this.hasCheckedIn(userId)) throw new DataError("CONFLICT", "今天已经打过卡了");

      const now = new Date().toISOString();
      const { data, error } = await this.client
        .from("checkin_records")
        .insert({ user_id: userId, check_in_time: now, created_at: now, note: note?.trim() || null })
        .select()
        .single();
      if (error) throw error;
      return mapRow(data);
    });
  }

  findHistory(page = 1, pageSize = 10) {
    return withSupabaseError(async () => {
      const userId = await getSessionUserId(this.client);
      if (!userId) return { records: [], total: 0 };

      const offset = Math.max(0, page - 1) * Math.max(1, pageSize);
      const { data, count, error } = await this.client
        .from("checkin_records")
        .select("*", { count: "exact" })
        .eq("user_id", userId)
        .order("check_in_time", { ascending: false })
        .range(offset, offset + Math.max(1, pageSize) - 1);
      if (error) throw error;
      return { records: (data ?? []).map(mapRow), total: count ?? 0 };
    });
  }

  getStreak() {
    return withSupabaseError(async () => {
      const userId = await getSessionUserId(this.client);
      if (!userId) return 0;
      const { data, error } = await this.client
        .from("checkin_records")
        .select("check_in_time")
        .eq("user_id", userId)
        .order("check_in_time", { ascending: false });
      if (error) throw error;
      return calculateCheckInStreak((data ?? [])
        .map((record) => record.check_in_time)
        .filter((value): value is string => Boolean(value)));
    });
  }
}
