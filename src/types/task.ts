export interface Task {
  id: string;
  title: string;
  completed: boolean;
  date?: string; // Now represents deadline date: ISO string format: YYYY-MM-DD HH:mm:ss
  project?: string;
  description?: string;
  icon?: string; // Task icon (emoji)
  completed_at?: string; // ISO string format representing when the task was completed
  updated_at?: string;
  user_id?: string;
  sort_order?: number; // Field for sorting tasks within a project
  deleted?: boolean; // Whether the task is in the trash
  deleted_at?: string; // ISO string format representing when the task was moved to trash
  abandoned?: boolean; // Whether the task has been abandoned
  abandoned_at?: string; // ISO string format representing when the task was abandoned
  attachments?: TaskAttachment[]; // File attachments
}

export interface TaskAttachment {
  id: string;
  filename: string;
  original_name: string;
  url: string;
  size: number;
  type: string;
  uploaded_at: string;
}

export interface Project {
  id: string;
  name: string;
  icon: string;
  count: number;
  isFixed?: boolean;
  color?: string;
  view_type?: string;
  user_id?: string;
}

export interface DateRange {
  from: Date;
  to?: Date;
}
