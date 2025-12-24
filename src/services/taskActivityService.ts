import { supabase } from "@/integrations/supabase/client";
import { TaskActivity, TaskActivityAction } from "@/types/taskActivity";
import { getOrCreateGuestId } from "./taskService";
import { isOfflineMode, getStorage, initializeStorage } from "@/storage";

export const createTaskActivity = async (
  taskId: string,
  action: TaskActivityAction,
  metadata?: Record<string, unknown>
): Promise<void> => {
  // In offline mode, use IndexedDB storage
  if (isOfflineMode) {
    await initializeStorage();
    const storage = getStorage();
    await storage.createTaskActivity({
      task_id: taskId,
      action,
      metadata: metadata ?? null,
    });
    return;
  }

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

export const fetchTaskActivities = async (taskId: string): Promise<TaskActivity[]> => {
  // In offline mode, use IndexedDB storage
  if (isOfflineMode) {
    await initializeStorage();
    const storage = getStorage();
    return storage.getTaskActivities(taskId);
  }

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
