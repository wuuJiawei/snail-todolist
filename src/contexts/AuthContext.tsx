/**
 * Authentication Context
 * Supports both online (custom backend) and offline (local) modes
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { isOfflineMode, isOnlineMode } from "@/config/storage";
import { authApi, ApiClientError } from "@/lib/authApi";
import { AppUser, AppSession, createOfflineUser, createGuestUser, createOnlineUser } from "@/types/auth";

const GUEST_ID_KEY = "snail_guest_id";

const getGuestId = (): string | null => localStorage.getItem(GUEST_ID_KEY);
const setGuestId = (id: string): void => localStorage.setItem(GUEST_ID_KEY, id);
const clearGuestId = (): void => localStorage.removeItem(GUEST_ID_KEY);

interface AuthContextType {
  session: AppSession | null;
  user: AppUser | null;
  loading: boolean;
  isGuest: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithOAuth: (provider: 'github' | 'google') => Promise<void>;
  signInAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<AppSession | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const navigate = useNavigate();

  const initializeAuth = useCallback(async () => {
    if (isOfflineMode) {
      setUser(createOfflineUser());
      setSession(null);
      setIsGuest(false);
      setLoading(false);
      return;
    }

    if (isOnlineMode) {
      if (authApi.isAuthenticated()) {
        try {
          const profile = await authApi.getProfile();
          const appUser = createOnlineUser(profile);
          setUser(appUser);
          setSession({
            access_token: authApi.getToken()!,
            user: appUser,
          });
        } catch (error) {
          if (error instanceof ApiClientError && error.isUnauthorized()) {
            authApi.logout();
          }
          setUser(null);
          setSession(null);
        }
      }
      setLoading(false);
      return;
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const response = await authApi.login(email, password);
      const appUser = createOnlineUser(response.user);
      
      setUser(appUser);
      setSession({
        access_token: response.token,
        user: appUser,
      });
      setIsGuest(false);

      toast({
        title: "登录成功",
        description: "欢迎回来！",
      });

      navigate('/');
    } catch (error) {
      toast({
        title: "登录失败",
        description: error instanceof Error ? error.message : "请检查您的邮箱和密码",
        variant: "destructive",
      });
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    try {
      await authApi.register(email, password);
      
      toast({
        title: "注册成功",
        description: "请使用您的邮箱和密码登录",
      });
    } catch (error) {
      toast({
        title: "注册失败",
        description: error instanceof Error ? error.message : "请稍后再试",
        variant: "destructive",
      });
    }
  };

  const signInWithOAuth = async (_provider: 'github' | 'google') => {
    toast({
      title: "暂不支持",
      description: "OAuth 登录功能正在开发中",
      variant: "destructive",
    });
  };

  const signInAsGuest = async () => {
    try {
      let guestId = getGuestId();
      if (!guestId) {
        guestId = `guest-${crypto.randomUUID()}`;
        setGuestId(guestId);
      }

      const guestUser = createGuestUser(guestId);
      setUser(guestUser);
      setIsGuest(true);
      
      toast({
        title: "游客模式",
        description: "您现在以游客身份使用，部分功能可能受限",
      });
      
      navigate('/');
    } catch (error) {
      toast({
        title: "游客登录失败",
        description: error instanceof Error ? error.message : "请稍后再试",
        variant: "destructive",
      });
    }
  };

  const signOut = async () => {
    if (isGuest) {
      setIsGuest(false);
      setUser(null);
      setSession(null);
      navigate('/auth');
      return;
    }

    authApi.logout();
    setUser(null);
    setSession(null);
    
    toast({
      title: "已退出登录",
      description: "期待您的再次使用",
    });
    
    navigate('/auth');
  };

  const refreshUser = async () => {
    if (isOfflineMode || isGuest || !authApi.isAuthenticated()) return;
    
    try {
      const profile = await authApi.getProfile();
      const appUser = createOnlineUser(profile);
      setUser(appUser);
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        loading,
        isGuest,
        signInWithEmail,
        signUpWithEmail,
        signInWithOAuth,
        signInAsGuest,
        signOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
