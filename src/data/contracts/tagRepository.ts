import type { Tag } from "@/types/tag";

export interface TagRepository {
  findAll(projectId?: string | null): Promise<Tag[]>;
  findById(id: string): Promise<Tag | null>;
  create(name: string, projectId?: string | null): Promise<Tag>;
  upsert(tag: Tag): Promise<Tag>;
  update(id: string, input: Partial<Pick<Tag, "name" | "project_id">>): Promise<Tag>;
  remove(id: string): Promise<void>;
  findByTaskIds(taskIds: string[]): Promise<Record<string, Tag[]>>;
  attachToTask(taskId: string, tagId: string): Promise<void>;
  detachFromTask(taskId: string, tagId: string): Promise<void>;
}
