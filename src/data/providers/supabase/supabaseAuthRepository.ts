import type { AuthEvent, AuthRepository, AuthUser } from "@/data/contracts/authRepository";
import { supabase } from "@/integrations/supabase/client";
import type { AuthChangeEvent } from "@supabase/supabase-js";
import { mapAuthSession, mapAuthUser } from "./mappers";
import { withSupabaseError } from "./mapSupabaseError";

const AUTH_EVENTS = new Set<AuthEvent>([
  "SIGNED_IN", "SIGNED_OUT", "TOKEN_REFRESHED", "USER_UPDATED", "PASSWORD_RECOVERY",
]);

export class SupabaseAuthRepository implements AuthRepository {
  getSession() {
    return withSupabaseError(async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return data.session ? mapAuthSession(data.session) : null;
    });
  }

  getCurrentUser() {
    return withSupabaseError(async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      return data.user ? mapAuthUser(data.user) : null;
    });
  }

  onAuthStateChange(listener: Parameters<AuthRepository["onAuthStateChange"]>[0]) {
    const { data } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session) => {
      if (AUTH_EVENTS.has(event as AuthEvent)) listener(event as AuthEvent, session ? mapAuthSession(session) : null);
    });
    return () => data.subscription.unsubscribe();
  }

  async signInWithPassword(email: string, password: string) {
    await withSupabaseError(async () => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    });
  }

  signUp(email: string, password: string) {
    return withSupabaseError(async () => {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      return data.user ? mapAuthUser(data.user) : null;
    });
  }

  async signInWithOAuth(provider: "github" | "google", redirectTo: string) {
    await withSupabaseError(async () => {
      const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
      if (error) throw error;
    });
  }

  setSession(accessToken: string, refreshToken: string) {
    return withSupabaseError(async () => {
      const { data, error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      if (error) throw error;
      if (!data.session) throw new Error("会话恢复失败");
      return mapAuthSession(data.session);
    });
  }

  async signOut() {
    await withSupabaseError(async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    });
  }

  async migrateGuestData(guestId: string, userId: string) {
    await withSupabaseError(async () => {
      const { error } = await supabase.rpc("migrate_guest_data" as "join_shared_project", {
        p_guest_id: guestId,
        p_user_id: userId,
      } as never);
      if (error) throw error;
    });
  }

  updateProfile(input: { name?: string; avatarUrl?: string }): Promise<AuthUser> {
    return withSupabaseError(async () => {
      const { data, error } = await supabase.auth.updateUser({
        data: { name: input.name, avatar_url: input.avatarUrl },
      });
      if (error) throw error;
      return mapAuthUser(data.user);
    });
  }
}
