import type { Task } from "@/types/task";

export interface TaskQuery {
  includeDeleted?: boolean;
  deleted?: boolean;
  abandoned?: boolean;
  completed?: boolean;
  flagged?: boolean;
  projectId?: string;
}

export type CreateTaskInput = Omit<Task, "id" | "_isPending" | "_tempId">;
export type UpdateTaskInput = Partial<Omit<Task, "id" | "_isPending" | "_tempId">>;
export interface TaskOrder { id: string; sort_order: number }

export interface TaskRepository {
  findAll(query?: TaskQuery): Promise<Task[]>;
  findById(id: string): Promise<Task | null>;
  create(input: CreateTaskInput): Promise<Task>;
  update(id: string, input: UpdateTaskInput): Promise<Task>;
  remove(id: string): Promise<void>;
  moveToTrash(id: string): Promise<Task>;
  restore(id: string): Promise<Task>;
  abandon(id: string): Promise<Task>;
  restoreAbandoned(id: string): Promise<Task>;
  reorder(items: TaskOrder[]): Promise<void>;
  subscribe(userId: string, projectIds: string[], onChange: () => void): () => void;
}
