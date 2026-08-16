import type { AuthSession, AuthUser } from "@/data/contracts/authRepository";
import type { CheckInRecord } from "@/data/contracts/checkInRepository";
import type { PomodoroSession } from "@/data/contracts/pomodoroRepository";
import type { DomainProject, DomainTag, DomainTask, DomainTaskAttachment, FileUploadResult } from "@/data/models";
import type { Session, User } from "@supabase/supabase-js";
import type { TaskDateType } from "@/types/task";

export type SupabaseTaskRow = {
  id: string;
  title: string;
  completed: boolean;
  date?: string | null;
  date_type?: TaskDateType | null;
  end_date?: string | null;
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

export type SupabaseProjectRow = {
  id: string; name: string; icon: string; count?: number | null; isFixed?: boolean | null;
  color?: string | null; view_type?: string | null; created_at?: string | null;
  updated_at?: string | null; sort_order?: number | null; user_id?: string | null;
  is_shared?: boolean | null; original_owner_id?: string | null;
};
export type SupabaseTagRow = {
  id: string; name: string; user_id?: string | null; project_id?: string | null; created_at?: string | null;
};

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

function normalizeAttachment(value: unknown): DomainTaskAttachment | null {
  if (!isRecord(value)) return null;
  const filename = value.filename ?? value.file_name;
  const originalName = value.originalName ?? value.original_name;
  const uploadedAt = value.uploadedAt ?? value.uploaded_at;
  const size = value.size ?? value.file_size;
  const type = value.type ?? value.file_type;
  if (
    typeof value.id !== "string" ||
    typeof filename !== "string" ||
    typeof originalName !== "string" ||
    typeof value.url !== "string" ||
    typeof size !== "number" ||
    typeof type !== "string" ||
    typeof uploadedAt !== "string"
  ) return null;
  return { id: value.id, filename, originalName, url: value.url, size, type, uploadedAt };
}

function parseAttachments(value: SupabaseTaskRow["attachments"]): DomainTaskAttachment[] {
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
  return rows.map(normalizeAttachment).filter((attachment): attachment is DomainTaskAttachment => attachment !== null);
}

export function mapTaskRow(row: SupabaseTaskRow): DomainTask {
  const task: DomainTask = {
    id: row.id,
    title: row.title,
    completed: row.completed,
    attachments: parseAttachments(row.attachments),
  };
  if (row.date != null) task.date = row.date;
  if (row.date_type != null) task.dateType = row.date_type;
  else if (row.date != null) task.dateType = "date";
  if (row.end_date != null) task.endDate = row.end_date;
  if (row.project != null) task.projectId = row.project;
  if (row.description != null) task.description = row.description;
  if (row.icon != null) task.icon = row.icon;
  if (row.completed_at != null) task.completedAt = row.completed_at;
  if (row.updated_at != null) task.updatedAt = row.updated_at;
  if (row.user_id != null) task.ownerId = row.user_id;
  if (row.sort_order !== null && row.sort_order !== undefined) {
    task.sortOrder = typeof row.sort_order === "string" ? Number.parseFloat(row.sort_order) : row.sort_order;
  }
  if (row.deleted !== undefined) task.deleted = row.deleted ?? false;
  if (row.deleted_at != null) task.deletedAt = row.deleted_at;
  if (row.abandoned !== undefined) task.abandoned = row.abandoned ?? false;
  if (row.abandoned_at != null) task.abandonedAt = row.abandoned_at;
  if (row.flagged !== undefined) task.flagged = row.flagged ?? false;
  return task;
}

export function mapProjectRow(row: SupabaseProjectRow): DomainProject {
  return {
    id: row.id, name: row.name, icon: row.icon, count: row.count ?? 0,
    isFixed: row.isFixed ?? undefined, color: row.color ?? undefined,
    viewType: row.view_type ?? undefined, createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined, sortOrder: row.sort_order ?? undefined,
    ownerId: row.user_id ?? undefined, isShared: row.is_shared ?? undefined,
    originalOwnerId: row.original_owner_id ?? undefined,
  };
}

export function mapTagRow(row: SupabaseTagRow): DomainTag {
  return { id: row.id, name: row.name, ownerId: row.user_id ?? undefined, projectId: row.project_id, createdAt: row.created_at ?? undefined };
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
