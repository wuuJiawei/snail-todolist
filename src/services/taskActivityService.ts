import { supabase } from "@/integrations/supabase/client";
import { TaskActivity, TaskActivityAction } from "@/types/taskActivity";
import { getOrCreateGuestId } from "./taskService";

/**
 * Create a task activity record in Supabase
 * Note: This function is only called in online mode via SupabaseAdapter
 * For offline mode, use storageOps.createTaskActivity() instead
 */
export const createTaskActivity = async (
  taskId: string,
  action: TaskActivityAction,
  metadata?: Record<string, unknown>
): Promise<void> => {
  const { data } = await supabase.auth.getUser();
  const userId = data?.user?.id;
  const payload: Record<string, unknown> = {
    task_id: taskId,
    action,
    metadata: metadata ?? null,
  };

  if (userId) {
    payload.user_id = userId;
  } else {
    payload.anonymous_id = getOrCreateGuestId();
  }

  const { error } = await supabase.from("task_activities").insert(payload);
  if (error) {
    throw error;
  }
};

/**
 * Fetch task activities from Supabase
 * Note: This function is only called in online mode via SupabaseAdapter
 * For offline mode, use storageOps.getTaskActivities() instead
 */
export const fetchTaskActivities = async (taskId: string): Promise<TaskActivity[]> => {
  const guestId = getOrCreateGuestId();
  const { data, error } = await supabase
    .from("task_activities")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data as TaskActivity[]).filter((activity) => {
    if (activity.user_id) return true;
    if (activity.anonymous_id) {
      return activity.anonymous_id === guestId;
    }
    return true;
  });
};
