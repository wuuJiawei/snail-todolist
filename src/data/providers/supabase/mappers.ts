import type { AuthSession, AuthUser } from "@/data/contracts/authRepository";
import type { CheckInRecord } from "@/data/contracts/checkInRepository";
import type { PomodoroSession } from "@/data/contracts/pomodoroRepository";
import type { FileUploadResult } from "@/data/models";
import type { Project } from "@/types/project";
import type { Tag } from "@/types/tag";
import type { Task, TaskAttachment } from "@/types/task";
import type { Session, User } from "@supabase/supabase-js";

export type SupabaseTaskRow = Pick<Task, "id" | "title" | "completed"> & {
  date?: string | null;
  project?: string | null;
  description?: string | null;
  icon?: string | null;
  completed_at?: string | null;
  updated_at?: string | null;
  user_id?: string | null;
  sort_order?: number | string | null;
  deleted?: boolean | null;
  deleted_at?: string | null;
  abandoned?: boolean | null;
  abandoned_at?: string | null;
  flagged?: boolean | null;
  attachments?: unknown;
};

export type SupabaseProjectRow = Omit<Project, "count" | "members"> & { count?: number | null };
export type SupabaseTagRow = Tag;

export interface SupabaseCheckInRow {
  id: string;
  check_in_time: string;
  note?: string | null;
  created_at: string;
}

export interface SupabasePomodoroRow {
  id: string;
  user_id?: string | null;
  task_id?: string | null;
  start_time: string;
  end_time?: string | null;
  duration: number;
  type: "focus" | "short_break" | "long_break";
  completed: boolean;
  created_at?: string;
  title?: string | null;
}

export interface SupabaseFileRow {
  id: string;
  filename: string;
  original_name: string;
  url: string;
  size: number;
  type: string;
  uploaded_at: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeAttachment(value: unknown): TaskAttachment | null {
  if (!isRecord(value)) return null;
  const filename = value.filename ?? value.file_name;
  const size = value.size ?? value.file_size;
  const type = value.type ?? value.file_type;
  if (
    typeof value.id !== "string" ||
    typeof filename !== "string" ||
    typeof value.original_name !== "string" ||
    typeof value.url !== "string" ||
    typeof size !== "number" ||
    typeof type !== "string" ||
    typeof value.uploaded_at !== "string"
  ) return null;
  return { id: value.id, filename, original_name: value.original_name, url: value.url, size, type, uploaded_at: value.uploaded_at };
}

function parseAttachments(value: SupabaseTaskRow["attachments"]): TaskAttachment[] {
  if (!value) return [];
  let rows: unknown;
  if (Array.isArray(value)) rows = value;
  else if (typeof value === "string") {
    try {
      rows = JSON.parse(value) as unknown;
    } catch {
      return [];
    }
  }
  if (!Array.isArray(rows)) return [];
  return rows.map(normalizeAttachment).filter((attachment): attachment is TaskAttachment => attachment !== null);
}

export function mapTaskRow(row: SupabaseTaskRow): Task {
  const task: Task = {
    id: row.id,
    title: row.title,
    completed: row.completed,
    attachments: parseAttachments(row.attachments),
  };
  if (row.date != null) task.date = row.date;
  if (row.project != null) task.project = row.project;
  if (row.description != null) task.description = row.description;
  if (row.icon != null) task.icon = row.icon;
  if (row.completed_at != null) task.completed_at = row.completed_at;
  if (row.updated_at != null) task.updated_at = row.updated_at;
  if (row.user_id != null) task.user_id = row.user_id;
  if (row.sort_order !== null && row.sort_order !== undefined) {
    task.sort_order = typeof row.sort_order === "string" ? Number.parseFloat(row.sort_order) : row.sort_order;
  }
  if (row.deleted !== undefined) task.deleted = row.deleted ?? false;
  if (row.deleted_at != null) task.deleted_at = row.deleted_at;
  if (row.abandoned !== undefined) task.abandoned = row.abandoned ?? false;
  if (row.abandoned_at != null) task.abandoned_at = row.abandoned_at;
  if (row.flagged !== undefined) task.flagged = row.flagged ?? false;
  return task;
}

export function mapProjectRow(row: SupabaseProjectRow): Project {
  return { ...row, count: row.count ?? 0 };
}

export function mapTagRow(row: SupabaseTagRow): Tag {
  return { ...row };
}

export function mapCheckInRow(row: SupabaseCheckInRow): CheckInRecord {
  return { id: row.id, checkInTime: row.check_in_time, note: row.note, createdAt: row.created_at };
}

export function mapPomodoroRow(row: SupabasePomodoroRow): PomodoroSession {
  return {
    id: row.id,
    userId: row.user_id ?? undefined,
    taskId: row.task_id,
    startTime: row.start_time,
    endTime: row.end_time ?? null,
    duration: row.duration,
    type: row.type,
    completed: row.completed,
    createdAt: row.created_at,
    title: row.title,
  };
}

export function mapFileRow(row: SupabaseFileRow): FileUploadResult {
  return {
    id: row.id,
    filename: row.filename,
    originalName: row.original_name,
    url: row.url,
    size: row.size,
    type: row.type,
    uploadedAt: row.uploaded_at,
  };
}

export function mapAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email,
    userMetadata: { ...user.user_metadata },
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

export function mapAuthSession(session: Session): AuthSession {
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at,
    user: mapAuthUser(session.user),
  };
}
