import type {
  ActivityRepository,
  AppInfoRepository,
  FileRepository,
  ProfileRepository,
  SearchRepository,
} from "@/data/contracts/supportRepositories";
import type { AppInfo, SearchOptions, UserProfile, UserSettings } from "@/data/models";
import type { TaskActivity } from "@/types/taskActivity";
import type { SupabaseAdapter } from "@/storage/supabase/SupabaseAdapter";
import { SupabaseAdapterBridge } from "./adapterBridge";
import { mapFileRow, mapTaskRow, type SupabaseFileRow, type SupabaseTaskRow } from "./mappers";
import { withSupabaseError } from "./mapSupabaseError";

export class SupabaseActivityRepository extends SupabaseAdapterBridge implements ActivityRepository {
  constructor(adapter: SupabaseAdapter) { super(adapter); }

  findByTaskId(taskId: string) {
    return withSupabaseError(async () => (await (await this.ready()).getTaskActivities(taskId)).map((row): TaskActivity => ({
      id: row.id,
      task_id: row.task_id,
      user_id: row.user_id,
      anonymous_id: null,
      action: row.action,
      metadata: row.metadata ?? null,
      created_at: row.created_at,
    })));
  }

  create(taskId: string, action: string, metadata?: Record<string, unknown>) {
    return withSupabaseError(async () => {
      const row = await (await this.ready()).createTaskActivity({ task_id: taskId, action, metadata });
      return {
        id: row.id, task_id: row.task_id, user_id: row.user_id, anonymous_id: null,
        action: row.action, metadata: row.metadata ?? null, created_at: row.created_at,
      };
    });
  }
}

export class SupabaseFileRepository extends SupabaseAdapterBridge implements FileRepository {
  constructor(adapter: SupabaseAdapter) { super(adapter); }
  uploadAttachment(taskId: string, file: File) {
    return withSupabaseError(async () => mapFileRow(await (await this.ready()).uploadAttachment(taskId, file) as SupabaseFileRow));
  }
  async deleteAttachment(attachmentId: string) {
    await withSupabaseError(async () => { await (await this.ready()).deleteAttachment(attachmentId); });
  }
  uploadImage(file: File) {
    return withSupabaseError(async () => mapFileRow(await (await this.ready()).uploadImage(file) as SupabaseFileRow));
  }
  uploadAvatar(file: File) {
    return withSupabaseError(async () => mapFileRow(await (await this.ready()).uploadAvatar(file) as SupabaseFileRow));
  }
}

const toLegacySettings = (settings: Partial<UserSettings>) => ({
  deadline_notification_enabled: settings.deadlineNotificationEnabled,
  deadline_notification_days: settings.deadlineNotificationDays,
  webhook_url: settings.webhookUrl,
  webhook_enabled: settings.webhookEnabled,
});

const toDomainSettings = (settings: Record<string, unknown>): UserSettings => ({
  deadlineNotificationEnabled: settings.deadline_notification_enabled as boolean | undefined,
  deadlineNotificationDays: settings.deadline_notification_days as number | undefined,
  webhookUrl: settings.webhook_url as string | undefined,
  webhookEnabled: settings.webhook_enabled as boolean | undefined,
});

export class SupabaseProfileRepository extends SupabaseAdapterBridge implements ProfileRepository {
  constructor(adapter: SupabaseAdapter) { super(adapter); }
  get() {
    return withSupabaseError(async (): Promise<UserProfile | null> => {
      const profile = await (await this.ready()).getUserProfile();
      return profile ? {
        id: profile.id,
        username: profile.username,
        avatarUrl: profile.avatar_url,
        settings: profile.settings ? toDomainSettings(profile.settings) : undefined,
        updatedAt: profile.updated_at,
      } : null;
    });
  }
  save(profile: Partial<UserProfile>) {
    return withSupabaseError(async () => {
      const saved = await (await this.ready()).saveUserProfile({
        id: profile.id,
        username: profile.username,
        avatar_url: profile.avatarUrl,
        settings: profile.settings ? toLegacySettings(profile.settings) : undefined,
        updated_at: profile.updatedAt,
      });
      return {
        id: saved.id, username: saved.username, avatarUrl: saved.avatar_url,
        settings: saved.settings ? toDomainSettings(saved.settings) : undefined, updatedAt: saved.updated_at,
      };
    });
  }
  getSettings() {
    return withSupabaseError(async () => toDomainSettings(await (await this.ready()).getUserSettings()));
  }
  saveSettings(settings: Partial<UserSettings>) {
    return withSupabaseError(async () => toDomainSettings(await (await this.ready()).saveUserSettings(toLegacySettings(settings))));
  }
}

export class SupabaseSearchRepository extends SupabaseAdapterBridge implements SearchRepository {
  constructor(adapter: SupabaseAdapter) { super(adapter); }
  searchTasks(query: string, options: SearchOptions = {}) {
    return withSupabaseError(async () => {
      const result = await (await this.ready()).searchTasks(query, {
        includeCompleted: options.includeCompleted,
        includeDeleted: options.includeDeleted,
        includeAbandoned: options.includeAbandoned,
        limit: options.limit,
        projectFilter: options.projectId,
      });
      return { ...result, tasks: result.tasks.map((row) => mapTaskRow(row as SupabaseTaskRow)) };
    });
  }
}

export class SupabaseAppInfoRepository extends SupabaseAdapterBridge implements AppInfoRepository {
  constructor(adapter: SupabaseAdapter) { super(adapter); }
  get() {
    return withSupabaseError(async (): Promise<AppInfo> => {
      const info = await (await this.ready()).getAppInfo();
      return {
        version: info.version,
        announcement: info.announcement,
        maintenanceMode: info.maintenance_mode,
      };
    });
  }
}
