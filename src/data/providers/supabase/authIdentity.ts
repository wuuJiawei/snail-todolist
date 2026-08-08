import type { SupabaseClient } from "@supabase/supabase-js";
import { DataError } from "@/data/contracts/errors";

type SupabaseAuthClient = Pick<SupabaseClient, "auth">;

export async function getSessionUserId(client: SupabaseAuthClient): Promise<string | null> {
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  return data.session?.user.id ?? null;
}

export async function requireSessionUserId(
  client: SupabaseAuthClient,
  message = "请先登录",
): Promise<string> {
  const userId = await getSessionUserId(client);
  if (!userId) throw new DataError("AUTH_REQUIRED", message);
  return userId;
}
