import type { Tag } from "./tag";

export type TaskDateType = "date" | "datetime" | "range";

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  date?: string; // 日期、具体时间或时间段开始时间（ISO string）
  date_type?: TaskDateType;
  end_date?: string; // 仅 date_type=range 时使用（ISO string）
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
  flagged?: boolean; // Whether the task is flagged for quick access
  attachments?: TaskAttachment[]; // File attachments
  tags?: Tag[]; // Optional relation data when the active provider can return it with the task query
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
