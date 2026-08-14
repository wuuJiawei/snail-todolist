import type { Task, TaskDateType } from "@/types/task";

export interface DomainTask {
  id: string;
  title: string;
  completed: boolean;
  date?: string;
  dateType?: TaskDateType;
  endDate?: string;
  projectId?: string;
  description?: string;
  icon?: string;
  completedAt?: string;
  updatedAt?: string;
  ownerId?: string;
  sortOrder?: number;
  deleted?: boolean;
  deletedAt?: string;
  abandoned?: boolean;
  abandonedAt?: string;
  flagged?: boolean;
  attachments?: DomainTaskAttachment[];
  tags?: DomainTag[];
}

export interface DomainTaskAttachment {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  size: number;
  type: string;
  uploadedAt: string;
}

export interface DomainProject {
  id: string;
  name: string;
  icon: string;
  count: number;
  isFixed?: boolean;
  color?: string;
  viewType?: string;
  createdAt?: string;
  updatedAt?: string;
  sortOrder?: number;
  ownerId?: string;
  isShared?: boolean;
  originalOwnerId?: string;
}

export interface DomainTag {
  id: string;
  name: string;
  ownerId?: string;
  projectId?: string | null;
  createdAt?: string;
}

export function toDomainTask(task: Task): DomainTask {
  return {
    id: task.id, title: task.title, completed: task.completed, date: task.date,
    dateType: task.date_type, endDate: task.end_date,
    projectId: task.project, description: task.description, icon: task.icon,
    completedAt: task.completed_at, updatedAt: task.updated_at, ownerId: task.user_id,
    sortOrder: task.sort_order, deleted: task.deleted, deletedAt: task.deleted_at,
    abandoned: task.abandoned, abandonedAt: task.abandoned_at, flagged: task.flagged,
    attachments: task.attachments?.map((file) => ({
      id: file.id, filename: file.filename, originalName: file.original_name, url: file.url,
      size: file.size, type: file.type, uploadedAt: file.uploaded_at,
    })),
    tags: task.tags?.map(toDomainTag),
  };
}

export function toLegacyTask(task: DomainTask): Task {
  const legacy: Task = {
    id: task.id, title: task.title, completed: task.completed, date: task.date,
    date_type: task.dateType, end_date: task.endDate,
    project: task.projectId, description: task.description, icon: task.icon,
    completed_at: task.completedAt, updated_at: task.updatedAt, user_id: task.ownerId,
    sort_order: task.sortOrder, deleted: task.deleted, deleted_at: task.deletedAt,
    abandoned: task.abandoned, abandoned_at: task.abandonedAt, flagged: task.flagged,
    attachments: task.attachments?.map((file) => ({
      id: file.id, filename: file.filename, original_name: file.originalName, url: file.url,
      size: file.size, type: file.type, uploaded_at: file.uploadedAt,
    })),
  };
  if (task.tags !== undefined) legacy.tags = task.tags.map(toLegacyTag);
  return legacy;
}

export function toDomainTaskUpdate(task: Partial<Task>): Partial<Omit<DomainTask, "id">> {
  const result: Partial<Omit<DomainTask, "id">> = {};
  const copy = <K extends keyof Omit<DomainTask, "id">>(key: K, value: DomainTask[K]) => { result[key] = value; };
  if ("title" in task) copy("title", task.title);
  if ("completed" in task) copy("completed", task.completed);
  if ("date" in task) copy("date", task.date);
  if ("date_type" in task) copy("dateType", task.date_type);
  if ("end_date" in task) copy("endDate", task.end_date);
  if ("project" in task) copy("projectId", task.project);
  if ("description" in task) copy("description", task.description);
  if ("icon" in task) copy("icon", task.icon);
  if ("completed_at" in task) copy("completedAt", task.completed_at);
  if ("updated_at" in task) copy("updatedAt", task.updated_at);
  if ("user_id" in task) copy("ownerId", task.user_id);
  if ("sort_order" in task) copy("sortOrder", task.sort_order);
  if ("deleted" in task) copy("deleted", task.deleted);
  if ("deleted_at" in task) copy("deletedAt", task.deleted_at);
  if ("abandoned" in task) copy("abandoned", task.abandoned);
  if ("abandoned_at" in task) copy("abandonedAt", task.abandoned_at);
  if ("flagged" in task) copy("flagged", task.flagged);
  if ("attachments" in task) copy("attachments", task.attachments?.map((file) => ({
    id: file.id, filename: file.filename, originalName: file.original_name, url: file.url,
    size: file.size, type: file.type, uploadedAt: file.uploaded_at,
  })));
  return result;
}

export function toDomainProject(project: import("@/types/project").Project): DomainProject {
  return {
    id: project.id, name: project.name, icon: project.icon, count: project.count,
    isFixed: project.isFixed, color: project.color, viewType: project.view_type,
    createdAt: project.created_at, updatedAt: project.updated_at, sortOrder: project.sort_order,
    ownerId: project.user_id, isShared: project.is_shared, originalOwnerId: project.original_owner_id,
  };
}

export function toLegacyProject(project: DomainProject): import("@/types/project").Project {
  return {
    id: project.id, name: project.name, icon: project.icon, count: project.count,
    isFixed: project.isFixed, color: project.color, view_type: project.viewType,
    created_at: project.createdAt, updated_at: project.updatedAt, sort_order: project.sortOrder,
    user_id: project.ownerId, is_shared: project.isShared, original_owner_id: project.originalOwnerId,
  };
}

export function toDomainProjectUpdate(project: Partial<import("@/types/project").Project>): Partial<Omit<DomainProject, "id" | "count">> {
  const result: Partial<Omit<DomainProject, "id" | "count">> = {};
  if (project.name !== undefined) result.name = project.name;
  if (project.icon !== undefined) result.icon = project.icon;
  if (project.isFixed !== undefined) result.isFixed = project.isFixed;
  if (project.color !== undefined) result.color = project.color;
  if (project.view_type !== undefined) result.viewType = project.view_type;
  if (project.created_at !== undefined) result.createdAt = project.created_at;
  if (project.updated_at !== undefined) result.updatedAt = project.updated_at;
  if (project.sort_order !== undefined) result.sortOrder = project.sort_order;
  if (project.user_id !== undefined) result.ownerId = project.user_id;
  if (project.is_shared !== undefined) result.isShared = project.is_shared;
  if (project.original_owner_id !== undefined) result.originalOwnerId = project.original_owner_id;
  return result;
}

export function toDomainTag(tag: import("@/types/tag").Tag): DomainTag {
  return { id: tag.id, name: tag.name, ownerId: tag.user_id, projectId: tag.project_id, createdAt: tag.created_at };
}

export function toLegacyTag(tag: DomainTag): import("@/types/tag").Tag {
  return { id: tag.id, name: tag.name, user_id: tag.ownerId, project_id: tag.projectId, created_at: tag.createdAt };
}

export interface FileUploadResult {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  size: number;
  type: string;
  uploadedAt: string;
}

export interface SearchOptions {
  includeCompleted?: boolean;
  includeDeleted?: boolean;
  includeAbandoned?: boolean;
  limit?: number;
  projectId?: string;
}

export interface SearchResult {
  tasks: DomainTask[];
  totalCount: number;
  searchTime: number;
}

export interface UserSettings {
  deadlineNotificationEnabled?: boolean;
  deadlineNotificationDays?: number;
  webhookUrl?: string;
  webhookEnabled?: boolean;
  [key: string]: unknown;
}

export interface UserProfile {
  id: string;
  username: string;
  avatarUrl?: string | null;
  settings?: UserSettings;
  updatedAt: string;
}

export interface AppInfo {
  version: string;
  announcement?: string;
  maintenanceMode?: boolean;
  contactEmail?: string;
  contactWebsite?: string;
  [key: string]: unknown;
}
