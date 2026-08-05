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
    projects: new SupabaseProjectRepository(adapter),
    projectCollaboration: new SupabaseProjectCollaborationRepository(),
    tags: new SupabaseTagRepository(adapter),
    checkIns: new SupabaseCheckInRepository(adapter),
    pomodoros: new SupabasePomodoroRepository(adapter),
    activities: new SupabaseActivityRepository(adapter),
    files: new SupabaseFileRepository(adapter),
    search: new SupabaseSearchRepository(adapter),
    profiles: new SupabaseProfileRepository(adapter),
    appInfo: new SupabaseAppInfoRepository(adapter),
    auth: new SupabaseAuthRepository(),
    chat: new SupabaseChatRepository(),
  };
}
