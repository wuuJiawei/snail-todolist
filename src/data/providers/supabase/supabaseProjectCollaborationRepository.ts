import type { ProjectCollaborationRepository, ProjectMemberWithProfile, ProjectShare } from "@/data/contracts/projectRepository";
import { supabase } from "./client";
import { withSupabaseError } from "./mapSupabaseError";
import type { Database } from "./database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

interface ProfileRow {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

const SHARE_CODE_LENGTH = 8;
const SHARE_CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

const generateShareCode = () => Array.from(
  { length: SHARE_CODE_LENGTH },
  () => SHARE_CODE_CHARS.charAt(Math.floor(Math.random() * SHARE_CODE_CHARS.length)),
).join("");

export class SupabaseProjectCollaborationRepository implements ProjectCollaborationRepository {
  private readonly untypedClient: SupabaseClient;

  constructor(private readonly client: SupabaseClient<Database> = supabase) {
    this.untypedClient = client as unknown as SupabaseClient;
  }

  listMembers(projectId: string) {
    return withSupabaseError(async () => {
      const { data, error } = await this.client
        .from("project_members")
        .select("id, project_id, user_id, role, created_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });
      if (error) throw error;

      const rows = data ?? [];
      const userIds = Array.from(new Set(rows.map((row) => row.user_id).filter(Boolean))) as string[];
      const profiles = new Map<string, ProfileRow>();
      if (userIds.length > 0) {
        const { data: profileRows, error: profileError } = await this.untypedClient
          .from("profiles")
          .select("id, email, display_name, avatar_url")
          .in("id", userIds);
        if (!profileError) {
          for (const profile of (profileRows ?? []) as ProfileRow[]) profiles.set(profile.id, profile);
        }
      }

      return rows.filter((row) => row.project_id && row.user_id).map((row): ProjectMemberWithProfile => {
        const profile = profiles.get(row.user_id!);
        return {
        id: row.id,
        project_id: row.project_id!,
        user_id: row.user_id!,
        role: row.role === "owner" ? "owner" : "member",
        created_at: row.created_at ?? undefined,
        profile: profile ? {
          id: profile.id,
          username: profile.display_name ?? profile.email,
          avatar_url: profile.avatar_url,
        } : null,
        };
      });
    });
  }

  async removeMember(projectId: string, userId: string) {
    await withSupabaseError(async () => {
      const { error } = await this.client
        .from("project_members")
        .delete()
        .eq("project_id", projectId)
        .eq("user_id", userId);
      if (error) throw error;
    });
  }

  getProfile(userId: string) {
    return withSupabaseError(async () => {
      const { data, error } = await this.untypedClient
        .from("profiles")
        .select("id, email, display_name, avatar_url")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      const profile = data as ProfileRow | null;
      return profile ? {
        id: profile.id,
        username: profile.display_name ?? profile.email,
        avatar_url: profile.avatar_url,
      } : null;
    });
  }

  getOrCreateShare(projectId: string, createdBy: string) {
    return withSupabaseError(async (): Promise<ProjectShare> => {
      const { data: existing, error: existingError } = await this.client
        .from("project_shares")
        .select("id, share_code, expires_at, is_active")
        .eq("project_id", projectId)
        .eq("is_active", true)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();
      if (existingError) throw existingError;

      let share = existing;
      if (!share) {
        const { error: deactivateError } = await this.client
          .from("project_shares")
          .update({ is_active: false })
          .eq("project_id", projectId)
          .eq("is_active", true);
        if (deactivateError) throw deactivateError;

        let shareCode = generateShareCode();
        for (let attempt = 0; attempt < 5; attempt += 1) {
          const { data: collision, error: collisionError } = await this.client
            .from("project_shares")
            .select("id")
            .eq("share_code", shareCode)
            .maybeSingle();
          if (collisionError) throw collisionError;
          if (!collision) break;
          shareCode = generateShareCode();
        }

        const { data: created, error: createError } = await this.client
          .from("project_shares")
          .insert({
            project_id: projectId,
            created_by: createdBy,
            share_code: shareCode,
            is_active: true,
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .select()
          .single();
        if (createError) throw createError;
        share = created;
      }

      return {
        id: share.id,
        shareCode: share.share_code,
        expiresAt: share.expires_at,
        active: share.is_active,
      };
    });
  }

  joinByCode(shareCode: string, userId: string) {
    return withSupabaseError(async () => {
      const { data, error } = await this.client.rpc("join_shared_project", {
        input_share_code: shareCode.toUpperCase(),
        joining_user_id: userId,
      });
      if (error) throw error;
      if (!data) throw new Error("无法加入清单");
      return String(data);
    });
  }

  subscribeToMembers(projectId: string, onChange: () => void) {
    const channel = this.client.channel(`share:members:${projectId}`).on(
      "postgres_changes",
      { event: "*", schema: "public", table: "project_members", filter: `project_id=eq.${projectId}` },
      onChange,
    ).subscribe();
    return () => { void this.client.removeChannel(channel); };
  }
}
