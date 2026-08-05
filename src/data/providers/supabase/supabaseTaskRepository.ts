import type { CreateTaskInput, TaskQuery, TaskRepository, UpdateTaskInput } from "@/data/contracts/taskRepository";
import { DataError } from "@/data/contracts/errors";
import { supabase } from "@/integrations/supabase/client";
import type { SupabaseAdapter } from "./SupabaseAdapter";
import { mapTaskRow, type SupabaseTaskRow } from "./mappers";
import { withSupabaseError } from "./mapSupabaseError";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Task } from "@/types/task";

export class SupabaseTaskRepository implements TaskRepository {
  constructor(private readonly adapter: SupabaseAdapter) {}

  findAll(query: TaskQuery = {}) {
    return withSupabaseError(async () => {
      const adapter = this.adapter;
      if (query.includeDeleted) {
        const groups = await Promise.all([
          adapter.getTasks({ deleted: false }),
          adapter.getTasks({ deleted: true, abandoned: false }),
          adapter.getTasks({ abandoned: true }),
        ]);
        const unique = new Map(groups.flat().map((row) => [row.id, row]));
        return [...unique.values()].map((row) => mapTaskRow(row as SupabaseTaskRow));
      }
      const rows = await adapter.getTasks({
        completed: query.completed,
        deleted: query.deleted ?? false,
        abandoned: query.abandoned,
        flagged: query.flagged,
        projectId: query.projectId,
      });
      return rows.map((row) => mapTaskRow(row as SupabaseTaskRow));
    }, "无法加载任务");
  }

  findById(id: string) {
    return withSupabaseError(async () => {
      const row = await this.adapter.getTaskById(id);
      return row ? mapTaskRow(row as SupabaseTaskRow) : null;
    }, "无法加载任务");
  }

  create(input: CreateTaskInput) {
    return withSupabaseError(async () => mapTaskRow(await this.adapter.createTask(input) as SupabaseTaskRow), "无法创建任务");
  }

  upsert(task: Task) {
    return withSupabaseError(async () => {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!auth.user) throw new DataError("AUTH_REQUIRED", "请先登录");
      const client = supabase as unknown as SupabaseClient;
      const { _isPending: _pending, _tempId: _temporary, attachments, ...row } = task;
      const { data, error } = await client.from("tasks").upsert({
        ...row,
        user_id: auth.user.id,
        attachments: attachments ? JSON.stringify(attachments) : null,
      }).select().single();
      if (error) throw error;
      return mapTaskRow(data as SupabaseTaskRow);
    }, "无法导入任务");
  }

  update(id: string, input: UpdateTaskInput) {
    return withSupabaseError(async () => {
      const row = await this.adapter.updateTask(id, input);
      if (!row) throw new DataError("NOT_FOUND", "任务不存在");
      return mapTaskRow(row as SupabaseTaskRow);
    }, "无法更新任务");
  }

  async remove(id: string) {
    await withSupabaseError(async () => {
      const removed = await this.adapter.deleteTask(id);
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
      const updated = await this.adapter.batchUpdateSortOrder(items);
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
