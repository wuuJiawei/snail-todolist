import type { TagRepository } from "@/data/contracts/tagRepository";
import { DataError } from "@/data/contracts/errors";
import type { SupabaseAdapter } from "./SupabaseAdapter";
import { mapTagRow, type SupabaseTagRow } from "./mappers";
import { withSupabaseError } from "./mapSupabaseError";
import { supabase } from "./client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Tag } from "@/types/tag";

export class SupabaseTagRepository implements TagRepository {
  constructor(private readonly adapter: SupabaseAdapter) {}

  findAll(projectId?: string | null) {
    return withSupabaseError(async () => (await this.adapter.getTags(projectId)).map((row) => mapTagRow(row as SupabaseTagRow)));
  }

  findById(id: string) {
    return withSupabaseError(async () => {
      const row = await this.adapter.getTagById(id);
      return row ? mapTagRow(row as SupabaseTagRow) : null;
    });
  }

  create(name: string, projectId?: string | null) {
    return withSupabaseError(async () => mapTagRow(await this.adapter.createTag(name, projectId) as SupabaseTagRow));
  }

  upsert(tag: Tag) {
    return withSupabaseError(async () => {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!auth.user) throw new DataError("AUTH_REQUIRED", "请先登录");
      const client = supabase as unknown as SupabaseClient;
      const { data, error } = await client.from("tags").upsert({ ...tag, user_id: auth.user.id }).select().single();
      if (error) throw error;
      return mapTagRow(data as SupabaseTagRow);
    });
  }

  update(id: string, input: { name?: string; project_id?: string | null }) {
    return withSupabaseError(async () => {
      const row = await this.adapter.updateTag(id, input);
      if (!row) throw new DataError("NOT_FOUND", "标签不存在");
      return mapTagRow(row as SupabaseTagRow);
    });
  }

  async remove(id: string) {
    await withSupabaseError(async () => {
      if (!await this.adapter.deleteTag(id)) throw new DataError("NOT_FOUND", "标签不存在");
    });
  }

  findByTaskIds(taskIds: string[]) {
    return withSupabaseError(() => this.adapter.getTagsByTaskIds(taskIds));
  }

  async attachToTask(taskId: string, tagId: string) {
    await withSupabaseError(() => this.adapter.attachTagToTask(taskId, tagId));
  }

  async detachFromTask(taskId: string, tagId: string) {
    await withSupabaseError(() => this.adapter.detachTagFromTask(taskId, tagId));
  }
}
