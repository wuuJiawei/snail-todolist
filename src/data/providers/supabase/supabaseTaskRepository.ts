import type { CreateTaskInput, TaskQuery, TaskRepository, UpdateTaskInput } from "@/data/contracts/taskRepository";
import { DataError } from "@/data/contracts/errors";
import { supabase } from "@/integrations/supabase/client";
import type { SupabaseAdapter } from "@/storage/supabase/SupabaseAdapter";
import { mapTaskRow, type SupabaseTaskRow } from "./mappers";
import { SupabaseAdapterBridge } from "./adapterBridge";
import { withSupabaseError } from "./mapSupabaseError";

export class SupabaseTaskRepository extends SupabaseAdapterBridge implements TaskRepository {
  constructor(adapter: SupabaseAdapter) { super(adapter); }

  findAll(query: TaskQuery = {}) {
    return withSupabaseError(async () => {
      const adapter = await this.ready();
      const rows = await adapter.getTasks({
        completed: query.completed,
        deleted: query.includeDeleted ? undefined : query.deleted ?? false,
        abandoned: query.abandoned,
        flagged: query.flagged,
        projectId: query.projectId,
      });
      return rows.map((row) => mapTaskRow(row as SupabaseTaskRow));
    }, "无法加载任务");
  }

  findById(id: string) {
    return withSupabaseError(async () => {
      const row = await (await this.ready()).getTaskById(id);
      return row ? mapTaskRow(row as SupabaseTaskRow) : null;
    }, "无法加载任务");
  }

  create(input: CreateTaskInput) {
    return withSupabaseError(async () => mapTaskRow(await (await this.ready()).createTask(input) as SupabaseTaskRow), "无法创建任务");
  }

  update(id: string, input: UpdateTaskInput) {
    return withSupabaseError(async () => {
      const row = await (await this.ready()).updateTask(id, input);
      if (!row) throw new DataError("NOT_FOUND", "任务不存在");
      return mapTaskRow(row as SupabaseTaskRow);
    }, "无法更新任务");
  }

  async remove(id: string) {
    await withSupabaseError(async () => {
      const removed = await (await this.ready()).deleteTask(id);
      if (!removed) throw new DataError("NOT_FOUND", "任务不存在");
    }, "无法删除任务");
  }

  moveToTrash(id: string) {
    return this.update(id, { deleted: true, deleted_at: new Date().toISOString() });
  }

  restore(id: string) {
    return this.update(id, { deleted: false, deleted_at: undefined });
  }

  abandon(id: string) {
    return this.update(id, {
      abandoned: true,
      abandoned_at: new Date().toISOString(),
      completed: false,
      completed_at: undefined,
    });
  }

  restoreAbandoned(id: string) {
    return this.update(id, { abandoned: false, abandoned_at: undefined });
  }

  async reorder(items: Array<{ id: string; sort_order: number }>) {
    await withSupabaseError(async () => {
      const updated = await (await this.ready()).batchUpdateSortOrder(items);
      if (!updated) throw new DataError("UNKNOWN", "任务排序失败");
    });
  }

  subscribe(userId: string, projectIds: string[], onChange: () => void) {
    const channels = [
      supabase.channel(`tasks:user:${userId}`).on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `user_id=eq.${userId}` },
        onChange,
      ).subscribe(),
    ];
    const chunkSize = 50;
    for (let index = 0; index < projectIds.length; index += chunkSize) {
      const chunk = projectIds.slice(index, index + chunkSize);
      const inList = chunk.map((id) => `"${id}"`).join(",");
      channels.push(supabase.channel(`tasks:projects:${userId}:${index / chunkSize}`).on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `project=in.(${inList})` },
        onChange,
      ).subscribe());
    }
    return () => { channels.forEach((channel) => { void supabase.removeChannel(channel); }); };
  }
}
