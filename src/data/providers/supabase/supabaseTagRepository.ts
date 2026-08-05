import type { TagRepository } from "@/data/contracts/tagRepository";
import { DataError } from "@/data/contracts/errors";
import type { SupabaseAdapter } from "./SupabaseAdapter";
import { SupabaseAdapterBridge } from "./adapterBridge";
import { mapTagRow, type SupabaseTagRow } from "./mappers";
import { withSupabaseError } from "./mapSupabaseError";
import { supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Tag } from "@/types/tag";

export class SupabaseTagRepository extends SupabaseAdapterBridge implements TagRepository {
  constructor(adapter: SupabaseAdapter) { super(adapter); }

  findAll(projectId?: string | null) {
    return withSupabaseError(async () => (await (await this.ready()).getTags(projectId)).map((row) => mapTagRow(row as SupabaseTagRow)));
  }

  findById(id: string) {
    return withSupabaseError(async () => {
      const row = await (await this.ready()).getTagById(id);
      return row ? mapTagRow(row as SupabaseTagRow) : null;
    });
  }

  create(name: string, projectId?: string | null) {
    return withSupabaseError(async () => mapTagRow(await (await this.ready()).createTag(name, projectId) as SupabaseTagRow));
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
      const row = await (await this.ready()).updateTag(id, input);
      if (!row) throw new DataError("NOT_FOUND", "标签不存在");
      return mapTagRow(row as SupabaseTagRow);
    });
  }

  async remove(id: string) {
    await withSupabaseError(async () => {
      if (!await (await this.ready()).deleteTag(id)) throw new DataError("NOT_FOUND", "标签不存在");
    });
  }

  findByTaskIds(taskIds: string[]) {
    return withSupabaseError(() => this.ready().then((adapter) => adapter.getTagsByTaskIds(taskIds)));
  }

  async attachToTask(taskId: string, tagId: string) {
    await withSupabaseError(() => this.ready().then((adapter) => adapter.attachTagToTask(taskId, tagId)));
  }

  async detachFromTask(taskId: string, tagId: string) {
    await withSupabaseError(() => this.ready().then((adapter) => adapter.detachTagFromTask(taskId, tagId)));
  }
}
