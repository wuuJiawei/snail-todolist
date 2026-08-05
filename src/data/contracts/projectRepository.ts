import type { Project } from "@/types/project";
import type { ProjectMember } from "@/types/projectMember";

export type CreateProjectInput = Omit<Project, "id" | "count" | "members">;
export type UpdateProjectInput = Partial<Omit<Project, "id" | "count" | "members">>;
export interface ProjectOrder { id: string; sort_order: number }

export interface ProjectMemberProfile {
  id: string;
  username: string | null;
  avatar_url: string | null;
}

export interface ProjectMemberWithProfile extends ProjectMember {
  profile: ProjectMemberProfile | null;
}

export interface ProjectShare {
  id: string;
  shareCode: string;
  expiresAt: string;
  active: boolean;
}

export interface ProjectRepository {
  findAll(): Promise<Project[]>;
  findById(id: string): Promise<Project | null>;
  create(input: CreateProjectInput): Promise<Project>;
  upsert(project: Project): Promise<Project>;
  update(id: string, input: UpdateProjectInput): Promise<Project>;
  remove(id: string): Promise<void>;
  reorder(items: ProjectOrder[]): Promise<void>;
  subscribeToMemberships(userId: string, ownedProjectIds: string[], onChange: () => void): () => void;
}

export interface ProjectCollaborationRepository {
  listMembers(projectId: string): Promise<ProjectMemberWithProfile[]>;
  removeMember(projectId: string, userId: string): Promise<void>;
  getProfile(userId: string): Promise<ProjectMemberProfile | null>;
  getOrCreateShare(projectId: string, createdBy: string): Promise<ProjectShare>;
  joinByCode(shareCode: string, userId: string): Promise<string>;
  subscribeToMembers(projectId: string, onChange: () => void): () => void;
}
