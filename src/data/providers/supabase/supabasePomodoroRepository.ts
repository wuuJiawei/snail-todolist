import type {
  PomodoroQuery,
  PomodoroRepository,
  PomodoroSession,
  PomodoroSessionType,
  PomodoroStats,
} from "@/data/contracts/pomodoroRepository";
import { DataError } from "@/data/contracts/errors";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "./client";
import type { Database } from "./database.types";
import { withSupabaseError } from "./mapSupabaseError";
import { getSessionUserId } from "./authIdentity";

interface PomodoroRow {
  id: string;
  user_id?: string | null;
  task_id?: string | null;
  start_time: string;
  end_time?: string | null;
  duration: number;
  type: string;
  completed: boolean;
  created_at?: string;
  title?: string | null;
}

const normalizeType = (value: string): PomodoroSessionType => {
  if (value === "long_break") return "long_break";
  if (value === "short_break" || value === "break") return "short_break";
  return "focus";
};

const mapSession = (row: PomodoroRow): PomodoroSession => ({
  id: row.id,
  userId: row.user_id ?? undefined,
  taskId: row.task_id,
  startTime: row.start_time,
  endTime: row.end_time ?? null,
  duration: row.duration,
  type: normalizeType(row.type),
  completed: row.completed,
  createdAt: row.created_at ?? row.start_time,
  title: row.title ?? null,
});

const actualMinutes = (session: PomodoroSession): number => {
  if (!session.endTime) return session.duration;
  const elapsed = Math.round((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 60000);
  return Number.isFinite(elapsed) && elapsed > 0 ? elapsed : session.duration;
};

export function calculatePomodoroStats(sessions: PomodoroSession[]): PomodoroStats {
  return sessions.reduce((stats, session) => {
    if (!session.completed) return stats;
    const minutes = actualMinutes(session);
    if (session.type === "focus") {
      stats.focusMinutes += minutes;
      stats.completedFocusSessions += 1;
    } else {
      stats.breakMinutes += minutes;
      stats.completedBreakSessions += 1;
    }
    return stats;
  }, { focusMinutes: 0, breakMinutes: 0, completedFocusSessions: 0, completedBreakSessions: 0 });
}

export class SupabasePomodoroRepository implements PomodoroRepository {
  private readonly queryClient: SupabaseClient;

  constructor(client: SupabaseClient<Database> = supabase) {
    this.queryClient = client as unknown as SupabaseClient;
  }

  findAll(query: PomodoroQuery = {}) {
    return withSupabaseError(async () => {
      const userId = await getSessionUserId(this.queryClient);
      if (!userId) return [];

      let request = this.queryClient
        .from("pomodoro_sessions")
        .select("*")
        .eq("user_id", userId);
      if (query.taskId) request = request.eq("task_id", query.taskId);
      if (query.from) request = request.gte("start_time", query.from);
      if (query.to) request = request.lte("start_time", query.to);
      request = request.order("start_time", { ascending: false });
      if (query.limit) request = request.limit(query.limit);

      const { data, error } = await request;
      if (error) throw error;
      return ((data ?? []) as PomodoroRow[]).map(mapSession);
    });
  }

  findActive() {
    return withSupabaseError(async () => {
      const userId = await getSessionUserId(this.queryClient);
      if (!userId) return null;
      const { data, error } = await this.queryClient
        .from("pomodoro_sessions")
        .select("*")
        .eq("user_id", userId)
        .is("end_time", null)
        .order("start_time", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data ? mapSession(data as PomodoroRow) : null;
    });
  }

  start(type: PomodoroSessionType, duration: number, title?: string) {
    return withSupabaseError(async () => {
      const userId = await getSessionUserId(this.queryClient);
      if (!userId) throw new DataError("AUTH_REQUIRED", "登录后才能使用番茄钟功能");
      const { data, error } = await this.queryClient
        .from("pomodoro_sessions")
        .insert({
          user_id: userId,
          type,
          duration,
          start_time: new Date().toISOString(),
          completed: false,
          title: title?.trim() || null,
        })
        .select()
        .single();
      if (error) throw error;
      return mapSession(data as PomodoroRow);
    });
  }

  complete(id: string, options: { completed?: boolean; endTime?: string; duration?: number } = {}) {
    return withSupabaseError(async () => {
      const userId = await getSessionUserId(this.queryClient);
      if (!userId) throw new DataError("AUTH_REQUIRED", "登录后才能使用番茄钟功能");
      const updates: Record<string, unknown> = {
        completed: options.completed ?? true,
        end_time: options.endTime ?? new Date().toISOString(),
      };
      if (typeof options.duration === "number") updates.duration = options.duration;

      const { data, error } = await this.queryClient
        .from("pomodoro_sessions")
        .update(updates)
        .eq("id", id)
        .eq("user_id", userId)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new DataError("NOT_FOUND", "番茄钟记录不存在");
      return mapSession(data as PomodoroRow);
    });
  }

  async remove(id: string) {
    await withSupabaseError(async () => {
      const userId = await getSessionUserId(this.queryClient);
      if (!userId) throw new DataError("AUTH_REQUIRED", "登录后才能使用番茄钟功能");
      const { error } = await this.queryClient
        .from("pomodoro_sessions")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
      if (error) throw error;
    });
  }

  async getTodayStats() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return calculatePomodoroStats(await this.findAll({ from: startOfDay.toISOString() }));
  }
}
