
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type PomodoroSession = {
  id?: string;
  user_id?: string;
  start_time?: string;
  end_time?: string | null;
  duration: number;
  type: 'focus' | 'break';
  completed: boolean;
};

// Start a new pomodoro session
export const startPomodoroSession = async (
  sessionType: 'focus' | 'break',
  duration: number
): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from("pomodoro_sessions")
      .insert({
        type: sessionType,
        duration: duration,
        start_time: new Date().toISOString(),
      })
      .select();

    if (error) {
      throw error;
    }

    return data?.[0]?.id || null;
  } catch (error) {
    console.error("Error starting pomodoro session:", error);
    return null;
  }
};

// Complete a pomodoro session
export const completePomodoroSession = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("pomodoro_sessions")
      .update({
        completed: true,
        end_time: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    console.error("Error completing pomodoro session:", error);
    toast({
      title: "保存失败",
      description: "无法保存番茄钟会话，请稍后再试",
      variant: "destructive",
    });
    return false;
  }
};

// Get today's stats
export const getTodayStats = async (): Promise<{
  focusCount: number;
  focusMinutes: number;
} | null> => {
  try {
    const { data, error } = await supabase
      .from("pomodoro_stats")
      .select("today_focus_count, today_focus_minutes")
      .single();

    if (error) {
      console.error("Error fetching today's stats:", error);
      return null;
    }

    return {
      focusCount: data.today_focus_count || 0,
      focusMinutes: data.today_focus_minutes || 0,
    };
  } catch (error) {
    console.error("Error fetching today's stats:", error);
    return null;
  }
};
