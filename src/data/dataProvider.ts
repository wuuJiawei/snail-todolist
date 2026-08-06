import type { AuthRepository } from "./contracts/authRepository";
import type { CheckInRepository } from "./contracts/checkInRepository";
import type { ChatRepository } from "./contracts/chatRepository";
import type { PomodoroRepository } from "./contracts/pomodoroRepository";
import type { ProjectCollaborationRepository, ProjectRepository } from "./contracts/projectRepository";
import type { TagRepository } from "./contracts/tagRepository";
import type { TaskRepository } from "./contracts/taskRepository";
import type {
  ActivityRepository,
  AppInfoRepository,
  DataTransferRepository,
  FileRepository,
  ProfileRepository,
  SearchRepository,
} from "./contracts/supportRepositories";

export type DataProviderType = "supabase" | "self-host";

export interface DataProvider {
  tasks: TaskRepository;
  projects: ProjectRepository;
  projectCollaboration: ProjectCollaborationRepository;
  tags: TagRepository;
  checkIns: CheckInRepository;
  chat: ChatRepository;
  pomodoros: PomodoroRepository;
  activities: ActivityRepository;
  files: FileRepository;
  search: SearchRepository;
  profiles: ProfileRepository;
  appInfo: AppInfoRepository;
  dataTransfer: DataTransferRepository;
  auth: AuthRepository;
}
