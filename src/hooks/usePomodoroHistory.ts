import { useCallback, useEffect, useMemo, useState } from "react";
import {
  deletePomodoroSession,
  fetchPomodoroSessions,
  getTodayStats,
  type PomodoroSession,
  type PomodoroTodayStats as ServiceTodayStats,
} from "@/services/pomodoroService";

interface WeeklyStatsDay {
  date: string;
  focusMinutes: number;
  breakMinutes: number;
  completedCount: number;
}

export interface WeeklyPomodoroSummary {
  days: WeeklyStatsDay[];
  totalFocusMinutes: number;
  totalFocusCount: number;
  totalBreakMinutes: number;
}

export interface UsePomodoroHistoryResult {
  today: ServiceTodayStats;
  weekly: WeeklyPomodoroSummary;
  recentSessions: PomodoroSession[];
  loading: boolean;
  refresh: () => Promise<void>;
  removeSession: (id: string) => Promise<boolean>;
}

const emptyTodayStats: ServiceTodayStats = {
  focusCount: 0,
  focusMinutes: 0,
  breakCount: 0,
  breakMinutes: 0,
  sessions: [],
};

const emptyWeeklySummary: WeeklyPomodoroSummary = {
  days: [],
  totalFocusMinutes: 0,
  totalFocusCount: 0,
  totalBreakMinutes: 0,
};

const formatDateKey = (date: Date): string => date.toISOString().slice(0, 10);

const isFocus = (session: PomodoroSession | undefined) =>
  session?.type === "focus" && session.completed;

const isBreak = (session: PomodoroSession | undefined) =>
  (session?.type === "short_break" || session?.type === "long_break") && session.completed;

const getSessionMinutes = (session: PomodoroSession): number => session.duration ?? 0;

export const usePomodoroHistory = (): UsePomodoroHistoryResult => {
  const [todayStats, setTodayStats] = useState<ServiceTodayStats>(emptyTodayStats);
  const [weeklySummary, setWeeklySummary] =
    useState<WeeklyPomodoroSummary>(emptyWeeklySummary);
  const [recentSessions, setRecentSessions] = useState<PomodoroSession[]>([]);
  const [loading, setLoading] = useState(false);

  const buildWeeklySummary = useCallback((sessions: PomodoroSession[]): WeeklyPomodoroSummary => {
    const days: Record<string, WeeklyStatsDay> = {};

    sessions.forEach((session) => {
      const dayKey = formatDateKey(new Date(session.start_time));
      if (!days[dayKey]) {
        days[dayKey] = {
          date: dayKey,
          focusMinutes: 0,
          breakMinutes: 0,
          completedCount: 0,
        };
      }

      if (session.completed) {
        days[dayKey].completedCount += session.type === "focus" ? 1 : 0;
      }

      if (isFocus(session)) {
        days[dayKey].focusMinutes += getSessionMinutes(session);
      } else if (isBreak(session)) {
        days[dayKey].breakMinutes += getSessionMinutes(session);
      }
    });

    const entries = Object.values(days).sort((a, b) => a.date.localeCompare(b.date));
    const totalFocusMinutes = entries.reduce((sum, day) => sum + day.focusMinutes, 0);
    const totalFocusCount = entries.reduce((sum, day) => sum + day.completedCount, 0);
    const totalBreakMinutes = entries.reduce((sum, day) => sum + day.breakMinutes, 0);

    return {
      days: entries,
      totalFocusMinutes,
      totalFocusCount,
      totalBreakMinutes,
    };
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const startOfRange = new Date(startOfToday);
      startOfRange.setDate(startOfRange.getDate() - 6); // last 7 days including today

      const [today, weeklySessions, recent] = await Promise.all([
        getTodayStats(),
        fetchPomodoroSessions({
          from: startOfRange.toISOString(),
          order: "asc",
        }),
        fetchPomodoroSessions({
          limit: 20,
          order: "desc",
        }),
      ]);

      setTodayStats(
        today ?? {
          focusCount: 0,
          focusMinutes: 0,
          breakCount: 0,
          breakMinutes: 0,
          sessions: [],
        }
      );

      setWeeklySummary(buildWeeklySummary(weeklySessions));
      setRecentSessions(recent);
    } catch (error) {
      console.error("Failed to refresh pomodoro history:", error);
      setTodayStats(emptyTodayStats);
      setWeeklySummary(emptyWeeklySummary);
      setRecentSessions([]);
    } finally {
      setLoading(false);
    }
  }, [buildWeeklySummary]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const normalizedWeekly = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const dayMap = new Map(weeklySummary.days.map((day) => [day.date, day]));
    const normalizedDays: WeeklyStatsDay[] = [];

    for (let i = 6; i >= 0; i -= 1) {
      const day = new Date(startOfToday);
      day.setDate(day.getDate() - i);
      const key = formatDateKey(day);
      normalizedDays.push(
        dayMap.get(key) ?? {
          date: key,
          focusMinutes: 0,
          breakMinutes: 0,
          completedCount: 0,
        }
      );
    }

    return {
      ...weeklySummary,
      days: normalizedDays,
    };
  }, [weeklySummary]);

  const removeSession = useCallback(
    async (id: string) => {
      const success = await deletePomodoroSession(id);
      if (success) {
        await refresh();
      }
      return success;
    },
    [refresh]
  );

  return {
    today: todayStats,
    weekly: normalizedWeekly,
    recentSessions,
    loading,
    refresh,
    removeSession,
  };
};


