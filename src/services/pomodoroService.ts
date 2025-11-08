
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type PomodoroSessionType = "focus" | "short_break" | "long_break";

export interface PomodoroSession {
  id: string;
  user_id: string;
  start_time: string;
  end_time: string | null;
  duration: number;
  type: PomodoroSessionType;
  completed: boolean;
  created_at: string;
}

export interface CompletePomodoroOptions {
  completed?: boolean;
  /**
   * Optional explicit end time ISO string.
   * Defaults to the current timestamp.
   */
  endTime?: string;
  /**
   * Optional duration override (minutes).
   * Useful when recording a manual completion that differs from the original plan.
   */
  durationOverride?: number;
}

export interface FetchPomodoroSessionsOptions {
  /**
   * ISO timestamp string (inclusive) to filter sessions starting from this moment.
   */
  from?: string;
  /**
   * ISO timestamp string (inclusive) to filter sessions ending before this moment.
   */
  to?: string;
  /**
   * Limit the number of sessions returned.
   */
  limit?: number;
  /**
   * Sort order by start_time. Defaults to "desc".
   */
  order?: "asc" | "desc";
  /**
   * Filter by session type(s).
   */
  types?: PomodoroSessionType[];
  /**
   * Filter by completion state. When undefined, both completed and in-progress sessions are returned.
   */
  completed?: boolean;
}

export interface PomodoroTodayStats {
  focusCount: number;
  focusMinutes: number;
  breakCount: number;
  breakMinutes: number;
  sessions: PomodoroSession[];
}

const DEFAULT_ERROR_TOAST = {
  title: "操作失败",
  description: "与番茄钟同步时出现问题，请稍后重试。",
  variant: "destructive" as const,
};

const requireUserId = async (options: { silent?: boolean } = {}): Promise<string | null> => {
  const { silent = false } = options;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      console.error("Failed to retrieve Supabase user:", error);
      if (!silent) {
        toast({
          title: "身份验证失败",
          description: "请重新登录后再使用番茄钟功能。",
          variant: "destructive",
        });
      }
      return null;
    }

    const user = data?.user;
    if (!user) {
      if (!silent) {
        toast({
          title: "未登录",
          description: "登录后才能使用番茄钟功能。",
          variant: "destructive",
        });
      }
      return null;
    }
    return user.id;
  } catch (error) {
    console.error("Unexpected error retrieving Supabase user:", error);
    if (!silent) {
      toast({
        title: "身份验证失败",
        description: "请刷新页面或重新登录。",
        variant: "destructive",
      });
    }
    return null;
  }
};

const normalizeSessionType = (value: string | null | undefined): PomodoroSessionType => {
  if (value === "long_break") return "long_break";
  if (value === "short_break" || value === "break") return "short_break";
  return "focus";
};

const mapSession = (row: Record<string, any>): PomodoroSession => ({
  id: row.id,
  user_id: row.user_id,
  start_time: row.start_time,
  end_time: row.end_time ?? null,
  duration: typeof row.duration === "number" ? row.duration : 0,
  type: normalizeSessionType(row.type),
  completed: row.completed ?? false,
  created_at: row.created_at ?? row.start_time,
});

const calculateActualMinutes = (session: PomodoroSession): number => {
  if (!session.end_time) {
    return session.duration ?? 0;
  }

  const start = new Date(session.start_time).getTime();
  const end = new Date(session.end_time).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) {
    return session.duration ?? 0;
  }

  const diffMinutes = Math.max(0, Math.round((end - start) / 60000));
  // Fallback to stored duration if diff looks unrealistic (e.g., manual edits).
  if (diffMinutes === 0) {
    return session.duration ?? 0;
  }
  return diffMinutes;
};

export const startPomodoroSession = async (
  sessionType: PomodoroSessionType,
  durationMinutes: number
): Promise<PomodoroSession | null> => {
  const userId = await requireUserId();
  if (!userId) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from("pomodoro_sessions")
      .insert({
        user_id: userId,
        type: sessionType,
        duration: durationMinutes,
        start_time: new Date().toISOString(),
        completed: false,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return mapSession(data);
  } catch (error) {
    console.error("Error starting pomodoro session:", error);
    toast(DEFAULT_ERROR_TOAST);
    return null;
  }
};

export const completePomodoroSession = async (
  id: string,
  options: CompletePomodoroOptions = {}
): Promise<boolean> => {
  const userId = await requireUserId();
  if (!userId) {
    return false;
  }

  const { completed = true, endTime, durationOverride } = options;
  const updates: Record<string, any> = {
    completed,
    end_time: endTime ?? new Date().toISOString(),
  };

  if (typeof durationOverride === "number") {
    updates.duration = durationOverride;
  }

  try {
    const { error } = await supabase
      .from("pomodoro_sessions")
      .update(updates)
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    console.error("Error completing pomodoro session:", error);
    toast(DEFAULT_ERROR_TOAST);
    return false;
  }
};

export const cancelPomodoroSession = async (id: string): Promise<boolean> => {
  return completePomodoroSession(id, { completed: false });
};

export const deletePomodoroSession = async (id: string): Promise<boolean> => {
  const userId = await requireUserId();
  if (!userId) {
    return false;
  }

  try {
    const { error } = await supabase
      .from("pomodoro_sessions")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    console.error("Error deleting pomodoro session:", error);
    toast(DEFAULT_ERROR_TOAST);
    return false;
  }
};

export const getActivePomodoroSession = async (): Promise<PomodoroSession | null> => {
  const userId = await requireUserId({ silent: true });
  if (!userId) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from("pomodoro_sessions")
      .select("*")
      .eq("user_id", userId)
      .is("end_time", null)
      .order("start_time", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ? mapSession(data) : null;
  } catch (error) {
    console.error("Error fetching active pomodoro session:", error);
    return null;
  }
};

export const fetchPomodoroSessions = async (
  options: FetchPomodoroSessionsOptions = {}
): Promise<PomodoroSession[]> => {
  const userId = await requireUserId({ silent: options.limit !== undefined || options.from !== undefined });
  if (!userId) {
    return [];
  }

  try {
    let query = supabase
      .from("pomodoro_sessions")
      .select("*")
      .eq("user_id", userId);

    if (options.from) {
      query = query.gte("start_time", options.from);
    }

    if (options.to) {
      query = query.lte("start_time", options.to);
    }

    if (options.types && options.types.length > 0) {
      const normalizedTypes = options.types.map((type) =>
        type === "short_break" ? "short_break" : type === "long_break" ? "long_break" : "focus"
      );
      query = query.in("type", normalizedTypes);
    }

    if (typeof options.completed === "boolean") {
      query = query.eq("completed", options.completed);
    }

    query = query.order("start_time", { ascending: options.order === "asc" });

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return (data ?? []).map(mapSession);
  } catch (error) {
    console.error("Error fetching pomodoro sessions:", error);
    toast(DEFAULT_ERROR_TOAST);
    return [];
  }
};

export const getTodayStats = async (): Promise<PomodoroTodayStats | null> => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const sessions = await fetchPomodoroSessions({
    from: startOfDay.toISOString(),
    order: "asc",
  });

  if (!sessions.length) {
    return {
      focusCount: 0,
      focusMinutes: 0,
      breakCount: 0,
      breakMinutes: 0,
      sessions: [],
    };
  }

  let focusCount = 0;
  let focusMinutes = 0;
  let breakCount = 0;
  let breakMinutes = 0;

  sessions.forEach((session) => {
    if (!session.completed) return;
    const actualMinutes = calculateActualMinutes(session);

    if (session.type === "focus") {
      focusCount += 1;
      focusMinutes += actualMinutes;
    } else {
      breakCount += 1;
      breakMinutes += actualMinutes;
    }
  });

  return {
    focusCount,
    focusMinutes,
    breakCount,
    breakMinutes,
    sessions,
  };
};
