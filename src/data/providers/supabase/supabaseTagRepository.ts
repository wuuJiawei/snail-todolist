import type { TagRepository } from "@/data/contracts/tagRepository";
import { DataError } from "@/data/contracts/errors";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DomainTag } from "@/data/models";
import { supabase } from "./client";
import type { Database } from "./database.types";
import { mapTagRow, type SupabaseTagRow } from "./mappers";
import { withSupabaseError } from "./mapSupabaseError";

const BATCH_SIZE = 100;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type SupabaseTaskTagWithTagRow = {
  task_id: string;
  tag: SupabaseTagRow | SupabaseTagRow[] | null;
};

const hasErrorCode = (error: unknown, code: string): boolean =>
  typeof error === "object" && error !== null && "code" in error && error.code === code;

export class SupabaseTagRepository implements TagRepository {
  private readonly queryClient: SupabaseClient;

  constructor(client: SupabaseClient<Database> = supabase) {
    this.queryClient = client as unknown as SupabaseClient;
  }

  private async getUserId(): Promise<string | null> {
    const { data, error } = await this.queryClient.auth.getUser();
    if (error) throw error;
    return data.user?.id ?? null;
  }

  findAll(projectId?: string | null) {
    return withSupabaseError(async () => {
      if (typeof projectId === "string" && !UUID_PATTERN.test(projectId)) return [];
      const userId = await this.getUserId();
      if (!userId) return [];

      let request = this.queryClient
        .from("tags")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (projectId === null) request = request.is("project_id", null);
      else if (projectId) request = request.eq("project_id", projectId);

      const { data, error } = await request;
      if (error) throw error;
      return ((data ?? []) as SupabaseTagRow[]).map(mapTagRow);
    });
  }

  findById(id: string) {
    return withSupabaseError(async () => {
      const userId = await this.getUserId();
      if (!userId) return null;
      const { data, error } = await this.queryClient
        .from("tags")
        .select("*")
        .eq("id", id)
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data ? mapTagRow(data as SupabaseTagRow) : null;
    });
  }

  create(name: string, projectId?: string | null) {
    return withSupabaseError(async () => {
      const userId = await this.getUserId();
      if (!userId) throw new DataError("AUTH_REQUIRED", "请先登录后再创建标签");
      const { data, error } = await this.queryClient
        .from("tags")
        .insert({ name: name.trim(), user_id: userId, project_id: projectId ?? null })
        .select()
        .single();
      if (error) throw error;
      return mapTagRow(data as SupabaseTagRow);
    });
  }

  upsert(tag: DomainTag) {
    return withSupabaseError(async () => {
      const userId = await this.getUserId();
      if (!userId) throw new DataError("AUTH_REQUIRED", "请先登录");
      const { data, error } = await this.queryClient
        .from("tags")
        .upsert({ id: tag.id, name: tag.name, project_id: tag.projectId, created_at: tag.createdAt, user_id: userId })
        .select()
        .single();
      if (error) throw error;
      return mapTagRow(data as SupabaseTagRow);
    });
  }

  update(id: string, input: { name?: string; projectId?: string | null }) {
    return withSupabaseError(async () => {
      const updates = {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.projectId !== undefined ? { project_id: input.projectId } : {}),
      };
      const { data, error } = await this.queryClient
        .from("tags")
        .update(updates)
        .eq("id", id)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new DataError("NOT_FOUND", "标签不存在");
      return mapTagRow(data as SupabaseTagRow);
    });
  }

  async remove(id: string) {
    await withSupabaseError(async () => {
      const { data, error } = await this.queryClient
        .from("tags")
        .delete()
        .eq("id", id)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new DataError("NOT_FOUND", "标签不存在");
    });
  }

  findByTaskIds(taskIds: string[]) {
    return withSupabaseError(async () => {
      const uniqueTaskIds = Array.from(new Set(taskIds));
      const result: Record<string, DomainTag[]> = Object.fromEntries(uniqueTaskIds.map((taskId) => [taskId, []]));
      if (uniqueTaskIds.length === 0) return result;

      const batches = Array.from(
        { length: Math.ceil(uniqueTaskIds.length / BATCH_SIZE) },
        (_, index) => uniqueTaskIds.slice(index * BATCH_SIZE, (index + 1) * BATCH_SIZE),
      );
      const responses = await Promise.all(batches.map((batch) =>
        this.queryClient
          .from("task_tags")
          .select("task_id, tag:tags(*)")
          .in("task_id", batch)
      ));

      for (const { data, error } of responses) {
        if (error) throw error;
        for (const row of (data ?? []) as SupabaseTaskTagWithTagRow[]) {
          const relatedTags = Array.isArray(row.tag) ? row.tag : row.tag ? [row.tag] : [];
          if (result[row.task_id]) result[row.task_id].push(...relatedTags.map(mapTagRow));
        }
      }
      return result;
    });
  }

  async attachToTask(taskId: string, tagId: string) {
    await withSupabaseError(async () => {
      const { error } = await this.queryClient.from("task_tags").insert({ task_id: taskId, tag_id: tagId });
      if (error && !hasErrorCode(error, "23505")) throw error;
    });
  }

  async detachFromTask(taskId: string, tagId: string) {
    await withSupabaseError(async () => {
      const { error } = await this.queryClient
        .from("task_tags")
        .delete()
        .match({ task_id: taskId, tag_id: tagId });
      if (error) throw error;
    });
  }
}
