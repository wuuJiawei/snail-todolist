import { getDataProvider } from "./createDataProvider";
import type { AuthUser } from "./contracts/authRepository";
import type { PomodoroSession as DomainPomodoroSession, PomodoroSessionType } from "./contracts/pomodoroRepository";
import { toDomainProject, toDomainProjectUpdate, toDomainTag, toDomainTask, toDomainTaskUpdate, toLegacyProject, toLegacyTag, toLegacyTask, type AppInfo as DomainAppInfo, type FileUploadResult as DomainFileUploadResult, type SearchOptions as DomainSearchOptions, type UserProfile as DomainUserProfile, type UserSettings as DomainUserSettings } from "./models";
import type { Project } from "@/types/project";
import type { Tag } from "@/types/tag";
import type { Task } from "@/types/task";
import type { TaskActivity } from "@/types/taskActivity";

export interface PomodoroSessionPublic {
  id: string;
  user_id?: string;
  start_time: string;
  end_time: string | null;
  duration: number;
  type: PomodoroSessionType;
  completed: boolean;
  created_at: string;
  title?: string | null;
}

export interface FetchPomodoroSessionsOptions {
  from?: string;
  to?: string;
  limit?: number;
  order?: "asc" | "desc";
  types?: PomodoroSessionType[];
  completed?: boolean;
}

export interface PomodoroTodayStats {
  focusCount: number;
  focusMinutes: number;
  breakCount: number;
  breakMinutes: number;
  sessions: PomodoroSessionPublic[];
}

export interface PomodoroSession {
  id: string;
  task_id?: string | null;
  user_id?: string;
  duration: number;
  type: "work" | "short_break" | "long_break";
  started_at: string;
  completed_at?: string | null;
  created_at: string;
  title?: string | null;
}

export interface CheckInRecord {
  id: string;
  check_in_time: string;
  note?: string | null;
  created_at: string;
}

export interface FileUploadResult {
  id: string;
  filename: string;
  original_name: string;
  url: string;
  size: number;
  type: string;
  uploaded_at: string;
}

export interface UserSettings {
  deadline_notification_enabled?: boolean;
  deadline_notification_days?: number;
  webhook_url?: string;
  webhook_enabled?: boolean;
  [key: string]: unknown;
}

export interface UserProfile {
  id: string;
  username: string;
  avatar_url?: string | null;
  settings?: UserSettings;
  updated_at: string;
}

export interface AppInfo {
  version: string;
  announcement?: string;
  maintenance_mode?: boolean;
  [key: string]: unknown;
}

export interface SearchOptions {
  includeCompleted?: boolean;
  includeDeleted?: boolean;
  includeAbandoned?: boolean;
  limit?: number;
  projectFilter?: string;
}

export interface SearchResult { tasks: Task[]; totalCount: number; searchTime: number }

export function canPerformOperation(user: Pick<AuthUser, "id"> | null): boolean { return Boolean(user); }
export function requiresAuth(user: Pick<AuthUser, "id"> | null): boolean { return !user; }

export const fetchTasks = async (includeDeleted = false) => (await getDataProvider().tasks.findAll({ includeDeleted })).map(toLegacyTask);
export const fetchDeletedTasks = async () => (await getDataProvider().tasks.findAll({ deleted: true, abandoned: false })).map(toLegacyTask);
export const fetchAbandonedTasks = async () => (await getDataProvider().tasks.findAll({ abandoned: true })).map(toLegacyTask);
export const addTask = (task: Omit<Task, "id">) => getDataProvider().tasks.create(toDomainTask({ ...task, id: "pending" })).then(toLegacyTask);
export const updateTask = (id: string, updates: Partial<Task>) => getDataProvider().tasks.update(id, toDomainTaskUpdate(updates)).then(toLegacyTask);

export async function deleteTask(id: string): Promise<boolean> {
  try { await getDataProvider().tasks.remove(id); return true; } catch { return false; }
}
export async function moveToTrash(id: string): Promise<boolean> {
  try { await getDataProvider().tasks.moveToTrash(id); return true; } catch { return false; }
}
export async function restoreFromTrash(id: string): Promise<boolean> {
  try { await getDataProvider().tasks.restore(id); return true; } catch { return false; }
}
export async function abandonTask(id: string): Promise<boolean> {
  try { await getDataProvider().tasks.abandon(id); return true; } catch { return false; }
}
export async function restoreAbandonedTask(id: string): Promise<boolean> {
  try { await getDataProvider().tasks.restoreAbandoned(id); return true; } catch { return false; }
}
export async function batchUpdateSortOrder(items: Array<{ id: string; sort_order: number }>): Promise<boolean> {
  try { await getDataProvider().tasks.reorder(items.map(({ id, sort_order }) => ({ id, order: sort_order }))); return true; } catch { return false; }
}

export const fetchAllTags = async (projectId?: string | null) => (await getDataProvider().tags.findAll(projectId)).map(toLegacyTag);
export const createTag = (name: string, projectId?: string | null) => getDataProvider().tags.create(name, projectId).then(toLegacyTag);
export async function deleteTagById(id: string): Promise<boolean> {
  try { await getDataProvider().tags.remove(id); return true; } catch { return false; }
}
export const getTagsByTaskIds = async (taskIds: string[]) => Object.fromEntries(Object.entries(await getDataProvider().tags.findByTaskIds(taskIds)).map(([id, tags]) => [id, tags.map(toLegacyTag)]));
export async function attachTagToTask(taskId: string, tagId: string): Promise<boolean> {
  try { await getDataProvider().tags.attachToTask(taskId, tagId); return true; } catch { return false; }
}
export async function detachTagFromTask(taskId: string, tagId: string): Promise<boolean> {
  try { await getDataProvider().tags.detachFromTask(taskId, tagId); return true; } catch { return false; }
}
export const updateTag = (id: string, updates: Partial<Tag>) => getDataProvider().tags.update(id, { name: updates.name, projectId: updates.project_id }).then(toLegacyTag);
export const updateTagProject = (id: string, projectId: string | null) => getDataProvider().tags.update(id, { projectId }).then(toLegacyTag);

export const getProjects = async () => (await getDataProvider().projects.findAll()).map(toLegacyProject);
export const createProject = (project: Omit<Project, "id" | "count">) => getDataProvider().projects.create(toDomainProject({ ...project, id: "pending", count: 0 })).then(toLegacyProject);
export const updateProject = (id: string, updates: Partial<Project>) => getDataProvider().projects.update(id, toDomainProjectUpdate(updates)).then(toLegacyProject);
export async function deleteProject(id: string): Promise<boolean> {
  try { await getDataProvider().projects.remove(id); return true; } catch { return false; }
}
export async function batchUpdateProjectSortOrder(items: Array<{ id: string; sort_order: number }>): Promise<boolean> {
  try { await getDataProvider().projects.reorder(items.map(({ id, sort_order }) => ({ id, order: sort_order }))); return true; } catch { return false; }
}

export const subscribeToTasks = (userId: string, projectIds: string[], onChange: () => void) =>
  getDataProvider().tasks.subscribe(userId, projectIds, onChange);
export const subscribeToProjectMemberships = (userId: string, ownedProjectIds: string[], onChange: () => void) =>
  getDataProvider().projects.subscribeToMemberships(userId, ownedProjectIds, onChange);
export const joinSharedProject = (shareCode: string, userId: string) =>
  getDataProvider().projectCollaboration.joinByCode(shareCode, userId);
export const createProjectShare = (projectId: string, userId: string) =>
  getDataProvider().projectCollaboration.getOrCreateShare(projectId, userId);
export const listProjectMembers = (projectId: string) => getDataProvider().projectCollaboration.listMembers(projectId);
export const getProjectMemberProfile = (userId: string) => getDataProvider().projectCollaboration.getProfile(userId);
export const subscribeToProjectMembers = (projectId: string, onChange: () => void) =>
  getDataProvider().projectCollaboration.subscribeToMembers(projectId, onChange);
export const removeProjectMember = (projectId: string, userId: string) =>
  getDataProvider().projectCollaboration.removeMember(projectId, userId);
export const fetchChatMessages = (limit?: number, before?: string) => getDataProvider().chat.findRecent(limit, before);
export const subscribeToChat = (presence: Parameters<ReturnType<typeof getDataProvider>["chat"]["subscribe"]>[0], listener: Parameters<ReturnType<typeof getDataProvider>["chat"]["subscribe"]>[1]) =>
  getDataProvider().chat.subscribe(presence, listener);
export const sendChatMessage = (input: Parameters<ReturnType<typeof getDataProvider>["chat"]["send"]>[0]) =>
  getDataProvider().chat.send(input);
export const getAuthSession = () => getDataProvider().auth.getSession();
export const setAuthSession = (accessToken: string, refreshToken: string) => getDataProvider().auth.setSession(accessToken, refreshToken);
export const subscribeToAuth = (listener: Parameters<ReturnType<typeof getDataProvider>["auth"]["onAuthStateChange"]>[0]) => getDataProvider().auth.onAuthStateChange(listener);
export const getCurrentUser = () => getDataProvider().auth.getCurrentUser();
export const signInWithPassword = (email: string, password: string) => getDataProvider().auth.signInWithPassword(email, password);
export const signUp = (email: string, password: string) => getDataProvider().auth.signUp(email, password);
export const signInWithOAuth = (provider: "github" | "google", redirectTo: string) => getDataProvider().auth.signInWithOAuth(provider, redirectTo);
export const signOut = () => getDataProvider().auth.signOut();
export const migrateGuestData = (guestId: string, userId: string) => getDataProvider().auth.migrateGuestData(guestId, userId);

const toPublicSession = (session: DomainPomodoroSession): PomodoroSessionPublic => ({
  id: session.id,
  user_id: session.userId,
  start_time: session.startTime,
  end_time: session.endTime,
  duration: session.duration,
  type: session.type,
  completed: session.completed,
  created_at: session.createdAt ?? session.startTime,
  title: session.title,
});

const toLegacySession = (session: DomainPomodoroSession): PomodoroSession => ({
  id: session.id,
  user_id: session.userId,
  task_id: session.taskId,
  duration: session.duration,
  type: session.type === "focus" ? "work" : session.type,
  started_at: session.startTime,
  completed_at: session.endTime,
  created_at: session.createdAt ?? session.startTime,
  title: session.title,
});

export async function getPomodoroSessions(taskId?: string): Promise<PomodoroSession[]> {
  return (await getDataProvider().pomodoros.findAll({ taskId })).map(toLegacySession);
}
export async function startPomodoroSession(type: PomodoroSessionType, duration: number, title?: string) {
  try { return toPublicSession(await getDataProvider().pomodoros.start(type, duration, title?.trim() || undefined)); } catch { return null; }
}
export async function completePomodoroSession(id: string, options: { completed?: boolean; endTime?: string; durationOverride?: number } = {}) {
  try {
    await getDataProvider().pomodoros.complete(id, {
      completed: options.completed, endTime: options.endTime, duration: options.durationOverride,
    });
    return true;
  } catch { return false; }
}
export const cancelPomodoroSession = (id: string) => completePomodoroSession(id, { completed: false });
export async function getActivePomodoroSession() {
  const session = await getDataProvider().pomodoros.findActive();
  return session ? toPublicSession(session) : null;
}
export async function fetchPomodoroSessions(options: FetchPomodoroSessionsOptions = {}) {
  let sessions = (await getDataProvider().pomodoros.findAll({ from: options.from, to: options.to, limit: options.limit })).map(toPublicSession);
  if (options.types) sessions = sessions.filter((session) => options.types!.includes(session.type));
  if (options.completed !== undefined) sessions = sessions.filter((session) => session.completed === options.completed);
  sessions.sort((left, right) => (options.order === "asc" ? 1 : -1) * left.start_time.localeCompare(right.start_time));
  return options.limit ? sessions.slice(0, options.limit) : sessions;
}
export async function getPomodoroTodayStats(): Promise<PomodoroTodayStats> {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const sessions = await fetchPomodoroSessions({ from: start.toISOString(), order: "asc" });
  return sessions.reduce((stats, session) => {
    if (!session.completed) return stats;
    const minutes = session.end_time
      ? Math.max(0, Math.round((new Date(session.end_time).getTime() - new Date(session.start_time).getTime()) / 60000)) || session.duration
      : session.duration;
    if (session.type === "focus") { stats.focusCount += 1; stats.focusMinutes += minutes; }
    else { stats.breakCount += 1; stats.breakMinutes += minutes; }
    return stats;
  }, { focusCount: 0, focusMinutes: 0, breakCount: 0, breakMinutes: 0, sessions });
}
export async function createPomodoroSession(session: Omit<PomodoroSession, "id" | "created_at">) {
  const created = await getDataProvider().pomodoros.start(session.type === "work" ? "focus" : session.type, session.duration, session.title ?? undefined);
  return toLegacySession(created);
}
export async function updatePomodoroSession(id: string, updates: Partial<PomodoroSession>) {
  const updated = await getDataProvider().pomodoros.complete(id, {
    completed: updates.completed_at !== null,
    endTime: updates.completed_at ?? undefined,
    duration: updates.duration,
  });
  return toLegacySession(updated);
}
export async function deletePomodoroSession(id: string) {
  try { await getDataProvider().pomodoros.remove(id); return true; } catch { return false; }
}

export const getTaskActivities = (taskId: string) => getDataProvider().activities.findByTaskId(taskId);
export const createTaskActivity = (activity: { task_id: string; action: string; metadata?: Record<string, unknown> }) =>
  getDataProvider().activities.create(activity.task_id, activity.action, activity.metadata);

const toLegacyCheckIn = (record: Awaited<ReturnType<ReturnType<typeof getDataProvider>["checkIns"]["create"]>>): CheckInRecord => ({
  id: record.id, check_in_time: record.checkInTime, note: record.note, created_at: record.createdAt,
});
export const hasCheckedInToday = () => getDataProvider().checkIns.hasCheckedInToday();
export async function createCheckIn(note?: string) { try { return toLegacyCheckIn(await getDataProvider().checkIns.create(note)); } catch { return null; } }
export async function getCheckInHistory(page?: number, pageSize?: number) {
  const result = await getDataProvider().checkIns.findHistory(page, pageSize);
  return { records: result.records.map(toLegacyCheckIn), total: result.total };
}
export const getCheckInStreak = () => getDataProvider().checkIns.getStreak();

const toLegacyFile = (file: DomainFileUploadResult): FileUploadResult => ({
  id: file.id, filename: file.filename, original_name: file.originalName, url: file.url,
  size: file.size, type: file.type, uploaded_at: file.uploadedAt,
});
export async function uploadAttachment(taskId: string, file: File) { try { return toLegacyFile(await getDataProvider().files.uploadAttachment(taskId, file)); } catch { return null; } }
export async function deleteAttachment(id: string) { try { await getDataProvider().files.deleteAttachment(id); return true; } catch { return false; } }
export async function uploadImage(file: File) { try { return toLegacyFile(await getDataProvider().files.uploadImage(file)); } catch { return null; } }
export async function uploadAvatar(file: File) { try { return toLegacyFile(await getDataProvider().files.uploadAvatar(file)); } catch { return null; } }
export async function searchTasks(query: string, options: SearchOptions = {}): Promise<SearchResult> {
  const mapped: DomainSearchOptions = { ...options, projectId: options.projectFilter };
  const result = await getDataProvider().search.searchTasks(query, mapped);
  return { ...result, tasks: result.tasks.map(toLegacyTask) };
}

const toDomainSettings = (settings: Partial<UserSettings>): Partial<DomainUserSettings> => ({
  deadlineNotificationEnabled: settings.deadline_notification_enabled,
  deadlineNotificationDays: settings.deadline_notification_days,
  webhookUrl: settings.webhook_url,
  webhookEnabled: settings.webhook_enabled,
});
const toLegacySettings = (settings: DomainUserSettings): UserSettings => ({
  deadline_notification_enabled: settings.deadlineNotificationEnabled,
  deadline_notification_days: settings.deadlineNotificationDays,
  webhook_url: settings.webhookUrl,
  webhook_enabled: settings.webhookEnabled,
});
export async function getUserSettings() { return toLegacySettings(await getDataProvider().profiles.getSettings()); }
export async function saveUserSettings(settings: Partial<UserSettings>) { return toLegacySettings(await getDataProvider().profiles.saveSettings(toDomainSettings(settings))); }
export async function getUserProfile(): Promise<UserProfile | null> {
  const profile = await getDataProvider().profiles.get();
  return profile ? { id: profile.id, username: profile.username, avatar_url: profile.avatarUrl, settings: profile.settings ? toLegacySettings(profile.settings) : undefined, updated_at: profile.updatedAt } : null;
}
export async function saveUserProfile(profile: Partial<UserProfile>): Promise<UserProfile> {
  const input: Partial<DomainUserProfile> = { id: profile.id, username: profile.username, avatarUrl: profile.avatar_url, settings: profile.settings ? toDomainSettings(profile.settings) : undefined, updatedAt: profile.updated_at };
  const saved = await getDataProvider().profiles.save(input);
  return { id: saved.id, username: saved.username, avatar_url: saved.avatarUrl, settings: saved.settings ? toLegacySettings(saved.settings) : undefined, updated_at: saved.updatedAt };
}
export async function getAppInfo(): Promise<AppInfo> {
  const info: DomainAppInfo = await getDataProvider().appInfo.get();
  return { version: info.version, announcement: info.announcement, maintenance_mode: info.maintenanceMode };
}

export type { PomodoroSessionType, TaskActivity };
