import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export type ProjectMemberRow = {
  id: string;
  project_id: string | null;
  user_id: string | null;
  role: string;
  created_at: string | null;
  profile?: Profile | null;
};

export const listMembers = async (projectId: string): Promise<ProjectMemberRow[]> => {
  const { data, error } = await supabase
    .from("project_members")
    .select("id, project_id, user_id, role, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  const rows = (data || []) as Array<{ id: string; project_id: string | null; user_id: string | null; role: string; created_at: string | null; }>;
  const ids = Array.from(new Set(rows.map(r => r.user_id).filter(Boolean))) as string[];
  if (ids.length === 0) return rows as ProjectMemberRow[];
  const { data: profiles, error: pErr } = await (supabase as any)
    .from('profiles')
    .select('id, email, display_name, avatar_url')
    .in('id', ids);
  if (pErr) {
    // 降级：不影响成员基本显示
    return rows as ProjectMemberRow[];
  }
  const map: Record<string, Profile> = {};
  (profiles || []).forEach((p: any) => { map[p.id] = p as Profile; });
  const result: ProjectMemberRow[] = rows.map(r => ({ ...r, profile: r.user_id ? map[r.user_id] : null }));
  return result;
};

export const removeMember = async (projectId: string, userId: string): Promise<boolean> => {
  const { error } = await supabase
    .from("project_members")
    .delete()
    .eq("project_id", projectId)
    .eq("user_id", userId);
  if (error) throw error;
  return true;
};

export const getProfileById = async (userId: string): Promise<Profile | null> => {
  const { data, error } = await (supabase as any)
    .from('profiles')
    .select('id, email, display_name, avatar_url')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return (data as Profile) || null;
};
