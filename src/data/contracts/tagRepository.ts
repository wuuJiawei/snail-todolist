import type { DomainTag } from "@/data/models";

export interface TagRepository {
  findAll(projectId?: string | null): Promise<DomainTag[]>;
  findById(id: string): Promise<DomainTag | null>;
  create(name: string, projectId?: string | null): Promise<DomainTag>;
  upsert(tag: DomainTag): Promise<DomainTag>;
  update(id: string, input: Partial<Pick<DomainTag, "name" | "projectId">>): Promise<DomainTag>;
  remove(id: string): Promise<void>;
  findByTaskIds(taskIds: string[]): Promise<Record<string, DomainTag[]>>;
  attachToTask(taskId: string, tagId: string): Promise<void>;
  detachFromTask(taskId: string, tagId: string): Promise<void>;
}
