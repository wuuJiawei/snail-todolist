export type TaskActivityAction =
  | "task_created"
  | "title_updated"
  | "description_updated"
  | "status_updated"
  | "due_date_updated"
  | "project_changed"
  | "attachments_updated"
  | "tag_added"
  | "tag_removed"
  | "task_moved_to_trash"
  | "task_restored"
  | "task_abandoned"
  | "task_reactivated"
  | string;

export interface TaskActivity {
  id: string;
  task_id: string;
  user_id?: string | null;
  anonymous_id?: string | null;
  action: TaskActivityAction;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface TaskActivityInput {
  action: TaskActivityAction;
  metadata?: Record<string, unknown>;
}
