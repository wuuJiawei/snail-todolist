export interface AuthUserMetadata {
  name?: string;
  full_name?: string;
  avatar_url?: string;
  [key: string]: unknown;
}

export interface AuthUser {
  id: string;
  email?: string;
  userMetadata: AuthUserMetadata;
  createdAt: string;
  updatedAt?: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt?: number;
  user: AuthUser;
}

export type AuthEvent = "SIGNED_IN" | "SIGNED_OUT" | "TOKEN_REFRESHED" | "USER_UPDATED" | "PASSWORD_RECOVERY";

export interface AuthRepository {
  getSession(): Promise<AuthSession | null>;
  getCurrentUser(): Promise<AuthUser | null>;
  onAuthStateChange(listener: (event: AuthEvent, session: AuthSession | null) => void): () => void;
  signInWithPassword(email: string, password: string): Promise<void>;
  signUp(email: string, password: string): Promise<AuthUser | null>;
  signInWithOAuth(provider: "github" | "google", redirectTo: string): Promise<void>;
  setSession(accessToken: string, refreshToken: string): Promise<AuthSession>;
  signOut(): Promise<void>;
  migrateGuestData(guestId: string, userId: string): Promise<void>;
  updateProfile(input: { name?: string; avatarUrl?: string }): Promise<AuthUser>;
}
