import type {
  ActivityRepository,
  AppInfoRepository,
  FileRepository,
  ProfileRepository,
  SearchRepository,
} from "@/data/contracts/supportRepositories";
import { DataError } from "@/data/contracts/errors";
import type { AppInfo, SearchOptions, UserProfile, UserSettings } from "@/data/models";
import type { TaskActivity } from "@/types/taskActivity";
import { searchTasks } from "@/utils/searchUtils";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getOrCreateGuestId } from "@/utils/guestId";
import { supabase } from "./client";
import type { Database } from "./database.types";
import { mapFileRow, mapTaskRow, type SupabaseTaskRow } from "./mappers";
import { withSupabaseError } from "./mapSupabaseError";

const toDomainSettings = (settings: Record<string, unknown>): UserSettings => ({
  deadlineNotificationEnabled: settings.deadline_notification_enabled as boolean | undefined,
  deadlineNotificationDays: settings.deadline_notification_days as number | undefined,
  webhookUrl: settings.webhook_url as string | undefined,
  webhookEnabled: settings.webhook_enabled as boolean | undefined,
});

const toMetadataSettings = (settings: Partial<UserSettings>) => ({
  deadline_notification_enabled: settings.deadlineNotificationEnabled,
  deadline_notification_days: settings.deadlineNotificationDays,
  webhook_url: settings.webhookUrl,
  webhook_enabled: settings.webhookEnabled,
});

const mapActivity = (row: TaskActivity): TaskActivity => ({
  id: row.id,
  task_id: row.task_id,
  user_id: row.user_id ?? null,
  anonymous_id: row.anonymous_id ?? null,
  action: row.action,
  metadata: row.metadata ?? null,
  created_at: row.created_at,
});

export class SupabaseActivityRepository implements ActivityRepository {
  private readonly queryClient: SupabaseClient;

  constructor(client: SupabaseClient<Database> = supabase) {
    this.queryClient = client as unknown as SupabaseClient;
  }

  findByTaskId(taskId: string) {
    return withSupabaseError(async () => {
      const guestId = getOrCreateGuestId();
      const { data, error } = await this.queryClient
        .from("task_activities")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as TaskActivity[])
        .filter((activity) => activity.user_id || !activity.anonymous_id || activity.anonymous_id === guestId)
        .map(mapActivity);
    });
  }

  create(taskId: string, action: string, metadata?: Record<string, unknown>) {
    return withSupabaseError(async () => {
      const { data: auth, error: authError } = await this.queryClient.auth.getUser();
      if (authError) throw authError;
      const identity = auth.user
        ? { user_id: auth.user.id }
        : { anonymous_id: getOrCreateGuestId() };
      const { data, error } = await this.queryClient
        .from("task_activities")
        .insert({ task_id: taskId, action, metadata: metadata ?? null, ...identity })
        .select()
        .single();
      if (error) throw error;
      return mapActivity(data as TaskActivity);
    });
  }
}

export class SupabaseFileRepository implements FileRepository {
  private readonly queryClient: SupabaseClient<Database>;

  constructor(client: SupabaseClient<Database> = supabase) {
    this.queryClient = client;
  }

  private async requireUserId(): Promise<string> {
    const { data, error } = await this.queryClient.auth.getUser();
    if (error) throw error;
    if (!data.user) throw new DataError("AUTH_REQUIRED", "请先登录");
    return data.user.id;
  }

  private async upload(bucket: string, path: string, file: File) {
    const { data, error } = await this.queryClient.storage.from(bucket).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (error) throw error;
    const { data: urlData } = this.queryClient.storage.from(bucket).getPublicUrl(path);
    const filename = path.split("/").pop() ?? file.name;
    return mapFileRow({
      id: data.path,
      filename,
      original_name: file.name,
      url: urlData.publicUrl,
      size: file.size,
      type: file.type,
      uploaded_at: new Date().toISOString(),
    });
  }

  uploadAttachment(taskId: string, file: File) {
    return withSupabaseError(async () => {
      const userId = await this.requireUserId();
      const extension = file.name.split(".").pop() || "bin";
      const filename = `${Date.now()}_${Math.random().toString(36).substring(2, 10)}.${extension}`;
      return this.upload("task-attachments", `${userId}/${taskId}/${filename}`, file);
    });
  }

  async deleteAttachment(attachmentId: string) {
    await withSupabaseError(async () => {
      const { error } = await this.queryClient.storage.from("task-attachments").remove([attachmentId]);
      if (error) throw error;
    });
  }

  uploadImage(file: File) {
    return withSupabaseError(async () => {
      const userId = await this.requireUserId();
      const extension = file.name.split(".").pop() || "png";
      const filename = `paste_${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${extension}`;
      return this.upload("task-attachments", `${userId}/${filename}`, file);
    });
  }

  uploadAvatar(file: File) {
    return withSupabaseError(async () => {
      const userId = await this.requireUserId();
      const extension = file.name.split(".").pop() || "png";
      const filename = `${userId}-${Math.random().toString(36).substring(2)}.${extension}`;
      return this.upload("user-avatars", `avatars/${filename}`, file);
    });
  }
}

export class SupabaseProfileRepository implements ProfileRepository {
  constructor(private readonly client: SupabaseClient<Database> = supabase) {}

  get() {
    return withSupabaseError(async (): Promise<UserProfile | null> => {
      const { data, error } = await this.client.auth.getUser();
      if (error) throw error;
      if (!data.user) return null;
      const metadata = data.user.user_metadata ?? {};
      return {
        id: data.user.id,
        username: metadata.name || data.user.email || "",
        avatarUrl: metadata.avatar_url ?? null,
        settings: toDomainSettings(metadata),
        updatedAt: data.user.updated_at || new Date().toISOString(),
      };
    });
  }

  save(profile: Partial<UserProfile>) {
    return withSupabaseError(async () => {
      const metadata: Record<string, unknown> = {};
      if (profile.username !== undefined) metadata.name = profile.username;
      if (profile.avatarUrl !== undefined) metadata.avatar_url = profile.avatarUrl;
      if (profile.settings !== undefined) Object.assign(metadata, toMetadataSettings(profile.settings));
      const { error } = await this.client.auth.updateUser({ data: metadata });
      if (error) throw error;
      const saved = await this.get();
      if (!saved) throw new DataError("AUTH_REQUIRED", "请先登录");
      return saved;
    });
  }

  getSettings() {
    return withSupabaseError(async () => {
      const { data, error } = await this.client.auth.getUser();
      if (error) throw error;
      return toDomainSettings(data.user?.user_metadata ?? {});
    });
  }

  saveSettings(settings: Partial<UserSettings>) {
    return withSupabaseError(async () => {
      const current = await this.getSettings();
      const merged = { ...current, ...settings };
      const { error } = await this.client.auth.updateUser({ data: toMetadataSettings(merged) });
      if (error) throw error;
      return merged;
    });
  }
}

export class SupabaseSearchRepository implements SearchRepository {
  private readonly queryClient: SupabaseClient;

  constructor(client: SupabaseClient<Database> = supabase) {
    this.queryClient = client as unknown as SupabaseClient;
  }

  searchTasks(query: string, options: SearchOptions = {}) {
    return withSupabaseError(async () => {
      const normalized = query.trim();
      if (!normalized) return { tasks: [], totalCount: 0, searchTime: 0 };
      const startedAt = performance.now();
      const limit = options.limit ?? 50;

      let request = this.queryClient.from("tasks").select("*", { count: "exact" });
      if (!options.includeDeleted) request = request.or("deleted.is.null,deleted.eq.false");
      if (!options.includeAbandoned) request = request.or("abandoned.is.null,abandoned.eq.false");
      if (options.includeCompleted === false) request = request.eq("completed", false);
      if (options.projectId) request = request.eq("project", options.projectId);
      request = request
        .or(`title.ilike.%${normalized}%,description.ilike.%${normalized}%,project.ilike.%${normalized}%`)
        .order("completed", { ascending: true })
        .order("created_at", { ascending: false })
        .limit(limit);

      const primary = await request;
      if (!primary.error) {
        return {
          tasks: ((primary.data ?? []) as SupabaseTaskRow[]).map(mapTaskRow),
          totalCount: primary.count ?? 0,
          searchTime: performance.now() - startedAt,
        };
      }

      let fallback = this.queryClient.from("tasks").select("*");
      if (!options.includeDeleted) fallback = fallback.or("deleted.is.null,deleted.eq.false");
      if (!options.includeAbandoned) fallback = fallback.or("abandoned.is.null,abandoned.eq.false");
      if (options.includeCompleted === false) fallback = fallback.eq("completed", false);
      if (options.projectId) fallback = fallback.eq("project", options.projectId);
      const { data, error } = await fallback;
      if (error) throw error;

      const results = searchTasks(((data ?? []) as SupabaseTaskRow[]).map(mapTaskRow), normalized, {
        minScore: 0.5,
        maxResults: limit,
      });
      return {
        tasks: results.map((result) => result.task),
        totalCount: results.length,
        searchTime: performance.now() - startedAt,
      };
    });
  }
}

export class SupabaseAppInfoRepository implements AppInfoRepository {
  get(): Promise<AppInfo> {
    return Promise.resolve({ version: "1.0.0", announcement: undefined, maintenanceMode: false });
  }
}
