import type { DomainTask } from "@/data/models";

export interface TaskQuery {
  includeDeleted?: boolean;
  deleted?: boolean;
  abandoned?: boolean;
  completed?: boolean;
  flagged?: boolean;
  projectId?: string;
}

export type CreateTaskInput = Omit<DomainTask, "id">;
export type UpdateTaskInput = Partial<Omit<DomainTask, "id">>;
export interface TaskOrder { id: string; order: number }

export interface TaskRepository {
  findAll(query?: TaskQuery): Promise<DomainTask[]>;
  findById(id: string): Promise<DomainTask | null>;
  create(input: CreateTaskInput): Promise<DomainTask>;
  upsert(task: DomainTask): Promise<DomainTask>;
  update(id: string, input: UpdateTaskInput): Promise<DomainTask>;
  remove(id: string): Promise<void>;
  moveToTrash(id: string): Promise<DomainTask>;
  restore(id: string): Promise<DomainTask>;
  abandon(id: string): Promise<DomainTask>;
  restoreAbandoned(id: string): Promise<DomainTask>;
  reorder(items: TaskOrder[]): Promise<void>;
  subscribe(userId: string, projectIds: string[], onChange: () => void): () => void;
}
