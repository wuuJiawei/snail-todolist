import type { AppInfo, FileUploadResult, SearchOptions, SearchResult, UserProfile, UserSettings } from "@/data/models";
import type { TaskActivity } from "@/types/taskActivity";

export interface ActivityRepository {
  findByTaskId(taskId: string): Promise<TaskActivity[]>;
  create(taskId: string, action: string, metadata?: Record<string, unknown>): Promise<TaskActivity>;
}

export interface FileRepository {
  uploadAttachment(taskId: string, file: File): Promise<FileUploadResult>;
  deleteAttachment(attachmentId: string): Promise<void>;
  uploadImage(file: File): Promise<FileUploadResult>;
  uploadAvatar(file: File): Promise<FileUploadResult>;
}

export interface SearchRepository {
  searchTasks(query: string, options?: SearchOptions): Promise<SearchResult>;
}

export interface ProfileRepository {
  get(): Promise<UserProfile | null>;
  save(profile: Partial<UserProfile>): Promise<UserProfile>;
  getSettings(): Promise<UserSettings>;
  saveSettings(settings: Partial<UserSettings>): Promise<UserSettings>;
}

export interface AppInfoRepository {
  get(): Promise<AppInfo>;
}
