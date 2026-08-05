import type { CreateProjectInput, ProjectRepository, UpdateProjectInput } from "@/data/contracts/projectRepository";
import { DataError } from "@/data/contracts/errors";
import { supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SupabaseAdapter } from "./SupabaseAdapter";
import { mapProjectRow, type SupabaseProjectRow } from "./mappers";
import { withSupabaseError } from "./mapSupabaseError";

export class SupabaseProjectRepository implements ProjectRepository {
  constructor(private readonly adapter: SupabaseAdapter) {}

  findAll() {
    return withSupabaseError(async () => {
      const client = supabase as unknown as SupabaseClient;
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) return [];
      const userId = userData.user.id;
      const { data: ownedRows, error: ownedError } = await client.from("projects")
        .select("*").eq("user_id", userId).order("sort_order", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (ownedError) throw ownedError;
      const { data: memberships, error: memberError } = await client.from("project_members")
        .select("project:project_id(*)").eq("user_id", userId).order("created_at", { ascending: false });
      if (memberError) throw memberError;

      const owned = (ownedRows ?? []) as SupabaseProjectRow[];
      const ownedIds = owned.map((row) => row.id);
      const sharedOwned = new Set<string>();
      if (ownedIds.length) {
        const { data: memberRows, error } = await client.from("project_members")
          .select("project_id, user_id").in("project_id", ownedIds);
        if (error) throw error;
        const owners = new Map(owned.map((row) => [row.id, row.user_id]));
        for (const member of (memberRows ?? []) as Array<{ project_id: string | null; user_id: string | null }>) {
          if (member.project_id && member.user_id && member.user_id !== owners.get(member.project_id)) sharedOwned.add(member.project_id);
        }
      }
      const ownedIdSet = new Set(ownedIds);
      const memberProjects = (memberships ?? [])
        .map((entry) => (entry as { project?: SupabaseProjectRow | null }).project)
        .filter((project): project is SupabaseProjectRow => Boolean(project) && !ownedIdSet.has(project!.id));
      return [
        ...owned.map((row) => mapProjectRow({ ...row, is_shared: sharedOwned.has(row.id) })),
        ...memberProjects.map((row) => mapProjectRow({ ...row, is_shared: true })),
      ];
    });
  }

  findById(id: string) {
    return withSupabaseError(async () => {
      const row = await this.adapter.getProjectById(id);
      return row ? mapProjectRow(row as SupabaseProjectRow) : null;
    });
  }

  create(input: CreateProjectInput) {
    return withSupabaseError(async () => mapProjectRow(await this.adapter.createProject(input) as SupabaseProjectRow));
  }

  upsert(project: import("@/types/project").Project) {
    return withSupabaseError(async () => {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!auth.user) throw new DataError("AUTH_REQUIRED", "请先登录");
      const client = supabase as unknown as SupabaseClient;
      const { count: _count, members: _members, ...row } = project;
      const { data, error } = await client.from("projects").upsert({ ...row, user_id: auth.user.id }).select().single();
      if (error) throw error;
      return mapProjectRow(data as SupabaseProjectRow);
    });
  }

  update(id: string, input: UpdateProjectInput) {
    return withSupabaseError(async () => {
      const row = await this.adapter.updateProject(id, input);
      if (!row) throw new DataError("NOT_FOUND", "清单不存在");
      return mapProjectRow(row as SupabaseProjectRow);
    });
  }

  async remove(id: string) {
    await withSupabaseError(async () => {
      if (!await this.adapter.deleteProject(id)) throw new DataError("NOT_FOUND", "清单不存在");
    });
  }

  async reorder(items: Array<{ id: string; sort_order: number }>) {
    await withSupabaseError(async () => {
      if (!await this.adapter.batchUpdateProjectSortOrder(items)) throw new DataError("UNKNOWN", "清单排序失败");
    });
  }

  subscribeToMemberships(userId: string, ownedProjectIds: string[], onChange: () => void) {
    const channel = supabase.channel(`projects:members:${userId}`).on(
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
    return () => { void supabase.removeChannel(channel); };
  }
}
