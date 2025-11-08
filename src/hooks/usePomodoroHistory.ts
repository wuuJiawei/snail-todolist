import { useCallback, useEffect, useMemo, useState } from "react";
import {
  deletePomodoroSession,
  fetchPomodoroSessions,
  getTodayStats,
  type PomodoroSession,
  type PomodoroTodayStats as ServiceTodayStats,
} from "@/services/pomodoroService";

interface HeatmapDay {
  date: string;
  focusMinutes: number;
  focusCount: number;
}

export interface UsePomodoroHistoryResult {
  today: ServiceTodayStats;
  heatmap: HeatmapDay[];
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

const formatDateKey = (date: Date): string => date.toISOString().slice(0, 10);

const isFocus = (session: PomodoroSession | undefined) =>
  session?.type === "focus" && session.completed;

const getSessionMinutes = (session: PomodoroSession): number => session.duration ?? 0;

const calculateHeatmapStart = (): Date => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - 364);
  const dayOfWeek = start.getDay();
  start.setDate(start.getDate() - dayOfWeek);
  return start;
};

export const usePomodoroHistory = (): UsePomodoroHistoryResult => {
  const [todayStats, setTodayStats] = useState<ServiceTodayStats>(emptyTodayStats);
  const [heatmapDays, setHeatmapDays] = useState<HeatmapDay[]>([]);
  const [recentSessions, setRecentSessions] = useState<PomodoroSession[]>([]);
  const [loading, setLoading] = useState(false);

  const buildHeatmap = useCallback((sessions: PomodoroSession[]): HeatmapDay[] => {
    const dayMap = new Map<string, HeatmapDay>();

    sessions.forEach((session) => {
      const key = formatDateKey(new Date(session.start_time));
      if (!dayMap.has(key)) {
        dayMap.set(key, {
          date: key,
          focusMinutes: 0,
          focusCount: 0,
        });
      }

      if (isFocus(session)) {
        const entry = dayMap.get(key)!;
        entry.focusMinutes += getSessionMinutes(session);
        entry.focusCount += 1;
      }
    });

    const start = calculateHeatmapStart();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const normalized: HeatmapDay[] = [];
    const cursor = new Date(start);
    while (cursor <= today) {
      const key = formatDateKey(cursor);
      normalized.push(
        dayMap.get(key) ?? {
          date: key,
          focusMinutes: 0,
          focusCount: 0,
        }
      );
      cursor.setDate(cursor.getDate() + 1);
    }

    return normalized;
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const startOfRange = calculateHeatmapStart();

      const [today, rangeSessions, recent] = await Promise.all([
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

      setHeatmapDays(buildHeatmap(rangeSessions));
      setRecentSessions(recent);
    } catch (error) {
      console.error("Failed to refresh pomodoro history:", error);
      setTodayStats(emptyTodayStats);
      setHeatmapDays([]);
      setRecentSessions([]);
    } finally {
      setLoading(false);
    }
  }, [buildHeatmap]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const heatmap = useMemo(() => heatmapDays, [heatmapDays]);

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
    heatmap,
    recentSessions,
    loading,
    refresh,
    removeSession,
  };
};

