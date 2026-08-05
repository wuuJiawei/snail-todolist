import type { CreateProjectInput, ProjectRepository, UpdateProjectInput } from "@/data/contracts/projectRepository";
import { DataError } from "@/data/contracts/errors";
import { supabase } from "@/integrations/supabase/client";
import type { SupabaseAdapter } from "@/storage/supabase/SupabaseAdapter";
import { SupabaseAdapterBridge } from "./adapterBridge";
import { mapProjectRow, type SupabaseProjectRow } from "./mappers";
import { withSupabaseError } from "./mapSupabaseError";

export class SupabaseProjectRepository extends SupabaseAdapterBridge implements ProjectRepository {
  constructor(adapter: SupabaseAdapter) { super(adapter); }

  findAll() {
    return withSupabaseError(async () => (await (await this.ready()).getProjects()).map((row) => mapProjectRow(row as SupabaseProjectRow)));
  }

  findById(id: string) {
    return withSupabaseError(async () => {
      const row = await (await this.ready()).getProjectById(id);
      return row ? mapProjectRow(row as SupabaseProjectRow) : null;
    });
  }

  create(input: CreateProjectInput) {
    return withSupabaseError(async () => mapProjectRow(await (await this.ready()).createProject(input) as SupabaseProjectRow));
  }

  update(id: string, input: UpdateProjectInput) {
    return withSupabaseError(async () => {
      const row = await (await this.ready()).updateProject(id, input);
      if (!row) throw new DataError("NOT_FOUND", "清单不存在");
      return mapProjectRow(row as SupabaseProjectRow);
    });
  }

  async remove(id: string) {
    await withSupabaseError(async () => {
      if (!await (await this.ready()).deleteProject(id)) throw new DataError("NOT_FOUND", "清单不存在");
    });
  }

  async reorder(items: Array<{ id: string; sort_order: number }>) {
    await withSupabaseError(async () => {
      if (!await (await this.ready()).batchUpdateProjectSortOrder(items)) throw new DataError("UNKNOWN", "清单排序失败");
    });
  }

  subscribeToMemberships(userId: string, onChange: () => void) {
    const channel = supabase.channel(`projects:members:${userId}`).on(
      "postgres_changes",
      { event: "*", schema: "public", table: "project_members", filter: `user_id=eq.${userId}` },
      onChange,
    ).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }
}
