import type { DomainProject } from "@/data/models";

export type CreateProjectInput = Omit<DomainProject, "id" | "count">;
export type UpdateProjectInput = Partial<Omit<DomainProject, "id" | "count">>;
export interface ProjectOrder { id: string; order: number }

export interface ProjectMemberProfile {
  id: string;
  username: string | null;
  avatar_url: string | null;
}

export interface ProjectMemberWithProfile {
  id: string;
  projectId: string;
  userId: string;
  role: "owner" | "member";
  createdAt?: string;
  profile: ProjectMemberProfile | null;
}

export interface ProjectShare {
  id: string;
  shareCode: string;
  expiresAt: string;
  active: boolean;
}

export interface ProjectRepository {
  findAll(): Promise<DomainProject[]>;
  findById(id: string): Promise<DomainProject | null>;
  create(input: CreateProjectInput): Promise<DomainProject>;
  upsert(project: DomainProject): Promise<DomainProject>;
  update(id: string, input: UpdateProjectInput): Promise<DomainProject>;
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
