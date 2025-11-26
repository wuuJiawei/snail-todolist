import { supabase } from "@/integrations/supabase/client";

const SHARE_CODE_LENGTH = 8;
const SHARE_CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

const genCode = () => {
  let s = "";
  for (let i = 0; i < SHARE_CODE_LENGTH; i++) {
    s += SHARE_CODE_CHARS.charAt(Math.floor(Math.random() * SHARE_CODE_CHARS.length));
  }
  return s;
};

export const getActiveShare = async (projectId: string) => {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("project_shares")
    .select("id, share_code, expires_at, is_active")
    .eq("project_id", projectId)
    .eq("is_active", true)
    .gt("expires_at", now)
    .maybeSingle();
  if (error) throw error;
  return data as { id: string; share_code: string; expires_at: string; is_active: boolean } | null;
};

export const deactivateActiveShares = async (projectId: string) => {
  const { error } = await supabase
    .from("project_shares")
    .update({ is_active: false })
    .eq("project_id", projectId)
    .eq("is_active", true);
  if (error) throw error;
  return true;
};

export const createShare = async (projectId: string, createdBy: string) => {
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  let code = genCode();
  for (let i = 0; i < 5; i++) {
    const { data: exists, error: checkErr } = await supabase
      .from("project_shares")
      .select("id")
      .eq("share_code", code)
      .maybeSingle();
    if (checkErr) throw checkErr;
    if (!exists) break;
    code = genCode();
  }
  const { data, error } = await supabase
    .from("project_shares")
    .insert({
      project_id: projectId,
      created_by: createdBy,
      share_code: code,
      is_active: true,
      expires_at: expires,
    })
    .select()
    .single();
  if (error) throw error;
  return data as { id: string; share_code: string; expires_at: string };
};

export const getOrCreateActiveShare = async (projectId: string, userId: string) => {
  const existing = await getActiveShare(projectId);
  if (existing) return existing;
  await deactivateActiveShares(projectId);
  return await createShare(projectId, userId);
};
