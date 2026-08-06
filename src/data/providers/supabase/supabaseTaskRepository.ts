import type { CreateTaskInput, TaskQuery, TaskRepository, UpdateTaskInput } from "@/data/contracts/taskRepository";
import { DataError } from "@/data/contracts/errors";
import type { DomainTask } from "@/data/models";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "./client";
import type { Database } from "./database.types";
import { withSupabaseError } from "./mapSupabaseError";
import { mapTaskRow, type SupabaseTaskRow } from "./mappers";

type TaskAccessRow = Pick<SupabaseTaskRow, "id" | "user_id" | "project">;
type TaskWrite = Record<string, string | number | boolean | null>;

const hasOwn = (value: object, key: PropertyKey): boolean => Object.prototype.hasOwnProperty.call(value, key);
const serializeAttachments = (attachments: DomainTask["attachments"] = []) => JSON.stringify(attachments.map((file) => ({
  id: file.id, filename: file.filename, original_name: file.originalName, url: file.url,
  size: file.size, type: file.type, uploaded_at: file.uploadedAt,
})));

function mapTaskUpdate(input: UpdateTaskInput, normalizeCompletion = true): TaskWrite {
  const updates: TaskWrite = {};
  const nullableStrings = [
    ["date", "date"], ["projectId", "project"], ["description", "description"], ["icon", "icon"],
    ["completedAt", "completed_at"], ["updatedAt", "updated_at"], ["deletedAt", "deleted_at"],
    ["abandonedAt", "abandoned_at"],
  ] as const;
  const booleans = ["completed", "deleted", "abandoned", "flagged"] as const;

  if (input.title !== undefined) updates.title = input.title;
  if (input.sortOrder !== undefined) updates.sort_order = input.sortOrder;
  for (const [field, column] of nullableStrings) {
    if (hasOwn(input, field)) updates[column] = input[field] ?? null;
  }
  for (const field of booleans) {
    if (input[field] !== undefined) updates[field] = input[field];
  }
  if (hasOwn(input, "attachments")) {
    updates.attachments = serializeAttachments(input.attachments);
  }
  if (normalizeCompletion && input.completed === true) updates.completed_at = new Date().toISOString();
  if (normalizeCompletion && input.completed === false) updates.completed_at = null;
  return updates;
}

function mapTaskForUpsert(task: DomainTask, userId: string): TaskWrite {
  return {
    id: task.id,
    title: task.title,
    completed: task.completed,
    date: task.date ?? null,
    project: task.projectId ?? null,
    description: task.description ?? null,
    icon: task.icon ?? null,
    completed_at: task.completedAt ?? null,
    updated_at: task.updatedAt ?? null,
    user_id: userId,
    sort_order: task.sortOrder ?? null,
    deleted: task.deleted ?? false,
    deleted_at: task.deletedAt ?? null,
    abandoned: task.abandoned ?? false,
    abandoned_at: task.abandonedAt ?? null,
    flagged: task.flagged ?? false,
    attachments: serializeAttachments(task.attachments),
  };
}

export class SupabaseTaskRepository implements TaskRepository {
  private readonly queryClient: SupabaseClient;

  constructor(client: SupabaseClient<Database> = supabase) {
    this.queryClient = client as unknown as SupabaseClient;
  }

  private async getUserId(): Promise<string | null> {
    const { data, error } = await this.queryClient.auth.getUser();
    if (error) throw error;
    return data.user?.id ?? null;
  }

  private async requireUserId(): Promise<string> {
    const userId = await this.getUserId();
    if (!userId) throw new DataError("AUTH_REQUIRED", "请先登录");
    return userId;
  }

  private async findAccessRow(id: string): Promise<TaskAccessRow> {
    const { data, error } = await this.queryClient
      .from("tasks")
      .select("id,user_id,project")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new DataError("NOT_FOUND", "任务不存在");
    return data as TaskAccessRow;
  }

  private async assertCanModify(id: string, userId: string, ownerOnly = false): Promise<void> {
    const task = await this.findAccessRow(id);
    if (task.user_id === userId) return;
    if (!task.project) throw new DataError("FORBIDDEN", "您没有权限操作此任务");

    const { data, error } = await this.queryClient
      .from("project_members")
      .select("role")
      .eq("project_id", task.project)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (!data || (ownerOnly && data.role !== "owner")) {
      throw new DataError("FORBIDDEN", "您没有权限操作此任务");
    }
  }

  private async assertCanCreateInProject(projectId: string, userId: string): Promise<void> {
    const { data: membership, error: memberError } = await this.queryClient
      .from("project_members")
      .select("id")
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .maybeSingle();
    if (memberError) throw memberError;
    if (membership) return;

    const { data: project, error: projectError } = await this.queryClient
      .from("projects")
      .select("user_id")
      .eq("id", projectId)
      .maybeSingle();
    if (projectError) throw projectError;
    if (!project || project.user_id !== userId) {
      throw new DataError("FORBIDDEN", "您没有权限在此清单中添加任务");
    }
  }

  findAll(query: TaskQuery = {}) {
    return withSupabaseError(async () => {
      const userId = await this.getUserId();
      if (!userId) return [];

      const { data: memberships, error: memberError } = await this.queryClient
        .from("project_members")
        .select("project_id")
        .eq("user_id", userId);
      if (memberError) throw memberError;
      const projectIds = (memberships ?? [])
        .map((membership) => membership.project_id as string | null)
        .filter((projectId): projectId is string => Boolean(projectId));

      let request = this.queryClient.from("tasks").select("*");
      request = projectIds.length
        ? request.or(`user_id.eq.${userId},project.in.(${projectIds.join(",")})`)
        : request.eq("user_id", userId);

      if (!query.includeDeleted) {
        if (query.abandoned === true) {
          request = request.eq("abandoned", true).eq("deleted", false);
        } else if (query.deleted === true) {
          request = request.eq("deleted", true).eq("abandoned", false);
        } else {
          request = request.eq("deleted", false).eq("abandoned", false);
        }
      }
      if (query.completed !== undefined) request = request.eq("completed", query.completed);
      if (query.flagged !== undefined) request = request.eq("flagged", query.flagged);
      if (query.projectId !== undefined) request = request.eq("project", query.projectId);

      if (query.deleted === true && !query.includeDeleted) {
        request = request.order("deleted_at", { ascending: false });
      } else if (query.abandoned === true && !query.includeDeleted) {
        request = request.order("abandoned_at", { ascending: false });
      } else {
        request = request
          .order("sort_order", { ascending: true, nullsFirst: false })
          .order("created_at", { ascending: false });
      }

      const { data, error } = await request;
      if (error) throw error;
      return ((data ?? []) as SupabaseTaskRow[]).map(mapTaskRow);
    }, "无法加载任务");
  }

  findById(id: string) {
    return withSupabaseError(async () => {
      const { data, error } = await this.queryClient.from("tasks").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data ? mapTaskRow(data as SupabaseTaskRow) : null;
    }, "无法加载任务");
  }

  create(input: CreateTaskInput) {
    return withSupabaseError(async () => {
      const userId = await this.requireUserId();
      if (input.projectId) await this.assertCanCreateInProject(input.projectId, userId);

      let orderRequest = this.queryClient
        .from("tasks")
        .select("sort_order")
        .eq("completed", input.completed);
      orderRequest = input.projectId
        ? orderRequest.eq("project", input.projectId)
        : orderRequest.is("project", null).eq("user_id", userId);
      const { data: orderRows, error: orderError } = await orderRequest
        .order("sort_order", { ascending: true })
        .limit(1);
      if (orderError) throw orderError;
      const minOrder = (orderRows?.[0] as { sort_order?: number | null } | undefined)?.sort_order ?? 1000;

      const { data, error } = await this.queryClient.from("tasks").insert({
        ...mapTaskUpdate(input, false),
        title: input.title,
        completed: input.completed,
        user_id: userId,
        sort_order: minOrder - 1000,
        flagged: input.flagged ?? false,
        attachments: serializeAttachments(input.attachments),
      }).select().single();
      if (error) throw error;
      return mapTaskRow(data as SupabaseTaskRow);
    }, "无法创建任务");
  }

  upsert(task: DomainTask) {
    return withSupabaseError(async () => {
      const userId = await this.requireUserId();
      const { data, error } = await this.queryClient
        .from("tasks")
        .upsert(mapTaskForUpsert(task, userId))
        .select()
        .single();
      if (error) throw error;
      return mapTaskRow(data as SupabaseTaskRow);
    }, "无法导入任务");
  }

  update(id: string, input: UpdateTaskInput) {
    return withSupabaseError(async () => {
      const userId = await this.requireUserId();
      await this.assertCanModify(id, userId);
      const { data, error } = await this.queryClient
        .from("tasks")
        .update(mapTaskUpdate(input))
        .eq("id", id)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new DataError("NOT_FOUND", "任务不存在");
      return mapTaskRow(data as SupabaseTaskRow);
    }, "无法更新任务");
  }

  async remove(id: string) {
    await withSupabaseError(async () => {
      const userId = await this.requireUserId();
      await this.assertCanModify(id, userId, true);
      const { data, error } = await this.queryClient
        .from("tasks")
        .delete()
        .eq("id", id)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new DataError("NOT_FOUND", "任务不存在");
    }, "无法删除任务");
  }

  moveToTrash(id: string) {
    return this.update(id, { deleted: true, deletedAt: new Date().toISOString() });
  }

  restore(id: string) {
    return this.update(id, { deleted: false, deletedAt: undefined });
  }

  abandon(id: string) {
    return this.update(id, {
      abandoned: true,
      abandonedAt: new Date().toISOString(),
      completed: false,
      completedAt: undefined,
    });
  }

  restoreAbandoned(id: string) {
    return this.update(id, { abandoned: false, abandonedAt: undefined });
  }

  async reorder(items: Array<{ id: string; order: number }>) {
    await withSupabaseError(async () => {
      if (items.length === 0) return;
      await this.requireUserId();
      const results = await Promise.all(items.map(({ id, order }) =>
        this.queryClient.from("tasks").update({ sort_order: order }).eq("id", id)
      ));
      const failed = results.find((result) => result.error);
      if (failed?.error) throw failed.error;
    }, "任务排序失败");
  }

  subscribe(userId: string, projectIds: string[], onChange: () => void) {
    const channels = [
      this.queryClient.channel(`tasks:user:${userId}`).on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `user_id=eq.${userId}` },
        onChange,
      ).subscribe(),
    ];
    const chunkSize = 50;
    for (let index = 0; index < projectIds.length; index += chunkSize) {
      const chunk = projectIds.slice(index, index + chunkSize);
      const inList = chunk.map((id) => `"${id}"`).join(",");
      channels.push(this.queryClient.channel(`tasks:projects:${userId}:${index / chunkSize}`).on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `project=in.(${inList})` },
        onChange,
      ).subscribe());
    }
    return () => { channels.forEach((channel) => { void this.queryClient.removeChannel(channel); }); };
  }
}
