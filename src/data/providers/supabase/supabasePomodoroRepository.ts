import type { PomodoroRepository, PomodoroSessionType } from "@/data/contracts/pomodoroRepository";
import { DataError } from "@/data/contracts/errors";
import type { SupabaseAdapter } from "./SupabaseAdapter";
import { withSupabaseError } from "./mapSupabaseError";
import { mapPomodoroRow, type SupabasePomodoroRow } from "./mappers";

const publicType = (type: "work" | "short_break" | "long_break"): PomodoroSessionType => type === "work" ? "focus" : type;

export class SupabasePomodoroRepository implements PomodoroRepository {
  constructor(private readonly adapter: SupabaseAdapter) {}

  findAll(query: { taskId?: string } = {}) {
    return withSupabaseError(async () => (await this.adapter.getPomodoroSessions(query.taskId)).map((row) => mapPomodoroRow({
      id: row.id,
      user_id: row.user_id,
      task_id: row.task_id,
      start_time: row.started_at,
      end_time: row.completed_at,
      duration: row.duration,
      type: publicType(row.type),
      completed: Boolean(row.completed_at),
      created_at: row.created_at,
      title: row.title,
    })));
  }

  async findActive() {
    const rows = await this.findAll();
    return rows.find((row) => !row.endTime) ?? null;
  }

  start(type: PomodoroSessionType, duration: number, title?: string) {
    return withSupabaseError(async () => {
      const row = await this.adapter.createPomodoroSession({
        duration,
        type: type === "focus" ? "work" : type,
        started_at: new Date().toISOString(),
        completed_at: null,
        title,
      });
      return mapPomodoroRow({
        id: row.id, user_id: row.user_id, task_id: row.task_id, start_time: row.started_at,
        end_time: row.completed_at, duration: row.duration, type: publicType(row.type), completed: false,
        created_at: row.created_at, title: row.title,
      });
    });
  }

  complete(id: string, options: { completed?: boolean; endTime?: string; duration?: number } = {}) {
    return withSupabaseError(async () => {
      const row = await this.adapter.updatePomodoroSession(id, {
        completed_at: options.completed === false ? null : options.endTime ?? new Date().toISOString(),
        duration: options.duration,
      });
      if (!row) throw new DataError("NOT_FOUND", "番茄钟记录不存在");
      return mapPomodoroRow({
        id: row.id, user_id: row.user_id, task_id: row.task_id, start_time: row.started_at,
        end_time: row.completed_at, duration: row.duration, type: publicType(row.type),
        completed: Boolean(row.completed_at), created_at: row.created_at, title: row.title,
      } as SupabasePomodoroRow);
    });
  }

  async remove(id: string) {
    await withSupabaseError(async () => {
      if (!await this.adapter.deletePomodoroSession(id)) throw new DataError("NOT_FOUND", "番茄钟记录不存在");
    });
  }

  async getTodayStats() {
    const sessions = await this.findAll();
    return sessions.reduce((stats, session) => {
      if (!session.completed) return stats;
      if (session.type === "focus") {
        stats.focusMinutes += session.duration;
        stats.completedFocusSessions += 1;
      } else {
        stats.breakMinutes += session.duration;
        stats.completedBreakSessions += 1;
      }
      return stats;
    }, { focusMinutes: 0, breakMinutes: 0, completedFocusSessions: 0, completedBreakSessions: 0 });
  }
}
