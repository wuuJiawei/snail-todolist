import type { ProjectCollaborationRepository, ProjectMemberWithProfile, ProjectShare } from "@/data/contracts/projectRepository";
import { supabase } from "@/integrations/supabase/client";
import { getOrCreateActiveShare } from "./legacy/projectShareService";
import { getProfileById, listMembers, removeMember } from "./legacy/projectMemberService";
import { withSupabaseError } from "./mapSupabaseError";

export class SupabaseProjectCollaborationRepository implements ProjectCollaborationRepository {
  listMembers(projectId: string) {
    return withSupabaseError(async () => (await listMembers(projectId))
      .filter((row) => row.project_id && row.user_id)
      .map((row): ProjectMemberWithProfile => ({
        id: row.id,
        project_id: row.project_id!,
        user_id: row.user_id!,
        role: row.role === "owner" ? "owner" : "member",
        created_at: row.created_at ?? undefined,
        profile: row.profile ? {
          id: row.profile.id,
          username: row.profile.display_name ?? row.profile.email,
          avatar_url: row.profile.avatar_url,
        } : null,
      })));
  }

  async removeMember(projectId: string, userId: string) {
    await withSupabaseError(async () => { await removeMember(projectId, userId); });
  }

  getProfile(userId: string) {
    return withSupabaseError(async () => {
      const profile = await getProfileById(userId);
      return profile ? {
        id: profile.id,
        username: profile.display_name ?? profile.email,
        avatar_url: profile.avatar_url,
      } : null;
    });
  }

  getOrCreateShare(projectId: string, createdBy: string) {
    return withSupabaseError(async (): Promise<ProjectShare> => {
      const share = await getOrCreateActiveShare(projectId, createdBy);
      return {
        id: share.id,
        shareCode: share.share_code,
        expiresAt: share.expires_at,
        active: "is_active" in share ? share.is_active : true,
      };
    });
  }

  joinByCode(shareCode: string, userId: string) {
    return withSupabaseError(async () => {
      const { data, error } = await supabase.rpc("join_shared_project", {
        input_share_code: shareCode.toUpperCase(),
        joining_user_id: userId,
      });
      if (error) throw error;
      if (!data) throw new Error("无法加入清单");
      return String(data);
    });
  }

  subscribeToMembers(projectId: string, onChange: () => void) {
    const channel = supabase.channel(`share:members:${projectId}`).on(
      "postgres_changes",
      { event: "*", schema: "public", table: "project_members", filter: `project_id=eq.${projectId}` },
      onChange,
    ).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }
}
