export type PomodoroSessionType = "focus" | "short_break" | "long_break";

export interface PomodoroSession {
  id: string;
  userId?: string;
  taskId?: string | null;
  startTime: string;
  endTime: string | null;
  duration: number;
  type: PomodoroSessionType;
  completed: boolean;
  createdAt?: string;
  title?: string | null;
}

export interface PomodoroQuery {
  taskId?: string;
  from?: string;
  to?: string;
  limit?: number;
}

export interface PomodoroStats {
  focusMinutes: number;
  breakMinutes: number;
  completedFocusSessions: number;
  completedBreakSessions: number;
}

export interface PomodoroRepository {
  findAll(query?: PomodoroQuery): Promise<PomodoroSession[]>;
  findActive(): Promise<PomodoroSession | null>;
  start(type: PomodoroSessionType, duration: number, title?: string): Promise<PomodoroSession>;
  complete(id: string, options?: { completed?: boolean; endTime?: string; duration?: number }): Promise<PomodoroSession>;
  remove(id: string): Promise<void>;
  getTodayStats(): Promise<PomodoroStats>;
}
