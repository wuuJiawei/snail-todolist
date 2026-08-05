import type { AuthSession, AuthUser } from "@/data/contracts/authRepository";
import type { CheckInRecord } from "@/data/contracts/checkInRepository";
import type { PomodoroSession } from "@/data/contracts/pomodoroRepository";
import type { FileUploadResult } from "@/data/models";
import type { Project } from "@/types/project";
import type { Tag } from "@/types/tag";
import type { Task, TaskAttachment } from "@/types/task";
import type { Session, User } from "@supabase/supabase-js";

export type SupabaseTaskRow = Omit<Task, "attachments" | "_isPending" | "_tempId"> & {
  attachments?: TaskAttachment[] | string | null;
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

function parseAttachments(value: SupabaseTaskRow["attachments"]): TaskAttachment[] | undefined {
  if (!value) return undefined;
  if (Array.isArray(value)) return value;
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed as TaskAttachment[] : undefined;
  } catch {
    return undefined;
  }
}

export function mapTaskRow(row: SupabaseTaskRow): Task {
  return { ...row, attachments: parseAttachments(row.attachments) };
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
