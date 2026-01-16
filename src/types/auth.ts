/**
 * Authentication types (Backend-compatible interface)
 */

export interface AppUser {
  id: string;
  email?: string;
  app_metadata: Record<string, unknown>;
  user_metadata: {
    name?: string;
    avatar_url?: string;
    is_admin?: boolean;
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
  nickname?: string;
  name?: string;
  avatar_url?: string;
  avatar?: string;
  is_admin?: boolean;
  created_at: string;
}): AppUser {
  return {
    id: data.id,
    email: data.email,
    app_metadata: {},
    user_metadata: {
      name: data.username || data.nickname || data.name || data.email,
      avatar_url: data.avatar_url || data.avatar,
      is_admin: data.is_admin,
    },
    aud: 'authenticated',
    created_at: data.created_at,
  };
}
