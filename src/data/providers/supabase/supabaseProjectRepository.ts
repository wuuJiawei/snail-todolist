import type { CreateProjectInput, ProjectRepository, UpdateProjectInput } from "@/data/contracts/projectRepository";
import type { DomainProject } from "@/data/models";
import { DataError } from "@/data/contracts/errors";
import { supabase } from "./client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { mapProjectRow, type SupabaseProjectRow } from "./mappers";
import { withSupabaseError } from "./mapSupabaseError";
import { getSessionUserId } from "./authIdentity";

type SupabaseOwnedProjectRow = SupabaseProjectRow & {
  members?: Array<{ user_id: string | null }> | null;
};

export class SupabaseProjectRepository implements ProjectRepository {
  private readonly queryClient: SupabaseClient;

  constructor(client: SupabaseClient<Database> = supabase) {
    this.queryClient = client as unknown as SupabaseClient;
  }

  findAll() {
    return withSupabaseError(async () => {
      const userId = await getSessionUserId(this.queryClient);
      if (!userId) return [];
      const { data: ownedRows, error: ownedError } = await this.queryClient.from("projects")
        .select("*, members:project_members(user_id)").eq("user_id", userId)
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (ownedError) throw ownedError;
      const owned = (ownedRows ?? []) as SupabaseOwnedProjectRow[];
      const { data: memberships, error: memberError } = await this.queryClient.from("project_members")
        .select("project:project_id(*)").eq("user_id", userId).order("created_at", { ascending: false });
      if (memberError) throw memberError;

      const ownedIds = owned.map((row) => row.id);
      const sharedOwned = new Set(
        owned
          .filter((row) => (row.members ?? []).some((member) => member.user_id && member.user_id !== row.user_id))
          .map((row) => row.id),
      );
      const ownedIdSet = new Set(ownedIds);
      const memberProjects = (memberships ?? [])
        .map((entry) => (entry as unknown as { project?: SupabaseProjectRow | null }).project)
        .filter((project): project is SupabaseProjectRow => Boolean(project) && !ownedIdSet.has(project!.id));
      return [
        ...owned.map((row) => mapProjectRow({ ...row, is_shared: sharedOwned.has(row.id) })),
        ...memberProjects.map((row) => mapProjectRow({ ...row, is_shared: true })),
      ];
    });
  }

  findById(id: string) {
    return withSupabaseError(async () => {
      const { data, error } = await this.queryClient.from("projects").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data ? mapProjectRow(data as SupabaseProjectRow) : null;
    });
  }

  create(input: CreateProjectInput) {
    return withSupabaseError(async () => {
      const userId = await getSessionUserId(this.queryClient);
      if (!userId) throw new DataError("AUTH_REQUIRED", "请先登录后再创建清单");

      const { data: maxOrderRows, error: orderError } = await this.queryClient
        .from("projects")
        .select("sort_order")
        .eq("user_id", userId)
        .order("sort_order", { ascending: false })
        .limit(1);
      if (orderError) throw orderError;
      const maxOrder = (maxOrderRows?.[0] as { sort_order?: number | null } | undefined)?.sort_order ?? 0;
      const now = new Date().toISOString();
      const { data, error } = await this.queryClient
        .from("projects")
        .insert({
          name: input.name,
          icon: input.icon || "folder",
          color: input.color || "#4CAF50",
          view_type: input.viewType || "list",
          created_at: now,
          updated_at: now,
          user_id: userId,
          sort_order: maxOrder + 1000,
        })
        .select()
        .single();
      if (error) throw error;
      return mapProjectRow(data as SupabaseProjectRow);
    });
  }

  upsert(project: DomainProject) {
    return withSupabaseError(async () => {
      const userId = await getSessionUserId(this.queryClient);
      if (!userId) throw new DataError("AUTH_REQUIRED", "请先登录");
      const { data, error } = await this.queryClient.from("projects").upsert({
        id: project.id,
        name: project.name,
        icon: project.icon,
        color: project.color,
        view_type: project.viewType,
        created_at: project.createdAt,
        updated_at: project.updatedAt,
        sort_order: project.sortOrder,
        is_shared: project.isShared,
        original_owner_id: project.originalOwnerId,
        user_id: userId,
      }).select().single();
      if (error) throw error;
      return mapProjectRow(data as SupabaseProjectRow);
    });
  }

  update(id: string, input: UpdateProjectInput) {
    return withSupabaseError(async () => {
      const updates = {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.icon !== undefined ? { icon: input.icon } : {}),
        ...(input.color !== undefined ? { color: input.color } : {}),
        ...(input.viewType !== undefined ? { view_type: input.viewType } : {}),
        ...(input.sortOrder !== undefined ? { sort_order: input.sortOrder } : {}),
        ...(input.isShared !== undefined ? { is_shared: input.isShared } : {}),
        ...(input.originalOwnerId !== undefined ? { original_owner_id: input.originalOwnerId } : {}),
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await this.queryClient
        .from("projects")
        .update(updates)
        .eq("id", id)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new DataError("NOT_FOUND", "清单不存在");
      return mapProjectRow(data as SupabaseProjectRow);
    });
  }

  async remove(id: string) {
    await withSupabaseError(async () => {
      const { data, error } = await this.queryClient.from("projects").delete().eq("id", id).select("id").maybeSingle();
      if (error) throw error;
      if (!data) throw new DataError("NOT_FOUND", "清单不存在");
    });
  }

  async reorder(items: Array<{ id: string; order: number }>) {
    await withSupabaseError(async () => {
      const results = await Promise.all(items.map(({ id, order }) =>
        this.queryClient.from("projects").update({ sort_order: order }).eq("id", id)
      ));
      const failed = results.find((result) => result.error);
      if (failed?.error) throw failed.error;
    });
  }

  subscribeToMemberships(userId: string, ownedProjectIds: string[], onChange: () => void) {
    const channel = this.queryClient.channel(`projects:members:${userId}`).on(
      "postgres_changes",
      { event: "*", schema: "public", table: "project_members", filter: `user_id=eq.${userId}` },
      onChange,
    );
    if (ownedProjectIds.length) {
      const ids = ownedProjectIds.map((id) => `"${id}"`).join(",");
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table: "project_members", filter: `project_id=in.(${ids})` },
        onChange,
      );
    }
    channel.subscribe();
    return () => { void this.queryClient.removeChannel(channel); };
  }
}
