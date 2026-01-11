/**
 * Authentication types (Supabase-compatible interface)
 */

export interface AppUser {
  id: string;
  email?: string;
  app_metadata: Record<string, unknown>;
  user_metadata: {
    name?: string;
    avatar_url?: string;
    [key: string]: unknown;
  };
  aud: string;
  created_at: string;
}

export interface AppSession {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  user: AppUser;
}

export function createOfflineUser(): AppUser {
  return {
    id: 'offline-user',
    email: 'offline@local',
    app_metadata: {},
    user_metadata: { name: 'Offline User' },
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  };
}

export function createGuestUser(guestId: string): AppUser {
  return {
    id: guestId,
    email: undefined,
    app_metadata: {},
    user_metadata: { name: 'Guest' },
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  };
}

export function createOnlineUser(data: {
  id: string;
  email: string;
  username?: string;
  avatar_url?: string;
  created_at: string;
}): AppUser {
  return {
    id: data.id,
    email: data.email,
    app_metadata: {},
    user_metadata: {
      name: data.username || data.email,
      avatar_url: data.avatar_url,
    },
    aud: 'authenticated',
    created_at: data.created_at,
  };
}
