import type { DataProvider } from "@/data/dataProvider";
import { SupabaseAdapter } from "./SupabaseAdapter";
import { SupabaseActivityRepository, SupabaseAppInfoRepository, SupabaseFileRepository, SupabaseProfileRepository, SupabaseSearchRepository } from "./supabaseSupportRepositories";
import { SupabaseAuthRepository } from "./supabaseAuthRepository";
import { SupabaseChatRepository } from "./supabaseChatRepository";
import { SupabaseCheckInRepository } from "./supabaseCheckInRepository";
import { SupabasePomodoroRepository } from "./supabasePomodoroRepository";
import { SupabaseProjectCollaborationRepository } from "./supabaseProjectCollaborationRepository";
import { SupabaseProjectRepository } from "./supabaseProjectRepository";
import { SupabaseTagRepository } from "./supabaseTagRepository";
import { SupabaseTaskRepository } from "./supabaseTaskRepository";

export function createSupabaseDataProvider(): DataProvider {
  const adapter = new SupabaseAdapter();
  return {
    tasks: new SupabaseTaskRepository(adapter),
    projects: new SupabaseProjectRepository(),
    projectCollaboration: new SupabaseProjectCollaborationRepository(),
    tags: new SupabaseTagRepository(),
    checkIns: new SupabaseCheckInRepository(),
    pomodoros: new SupabasePomodoroRepository(),
    activities: new SupabaseActivityRepository(),
    files: new SupabaseFileRepository(),
    search: new SupabaseSearchRepository(),
    profiles: new SupabaseProfileRepository(),
    appInfo: new SupabaseAppInfoRepository(),
    auth: new SupabaseAuthRepository(),
    chat: new SupabaseChatRepository(),
  };
}
