/**
 * Authentication Context
 * Supports both online (custom backend) and offline (local) modes
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { isOfflineMode, isOnlineMode } from "@/config/storage";
import { authApi, ApiClientError, AuthConfig } from "@/lib/authApi";
import { AppUser, AppSession, createOfflineUser, createGuestUser, createOnlineUser } from "@/types/auth";

const GUEST_ID_KEY = "snail_guest_id";

const getGuestId = (): string | null => localStorage.getItem(GUEST_ID_KEY);
const setGuestId = (id: string): void => localStorage.setItem(GUEST_ID_KEY, id);

interface AuthContextType {
  session: AppSession | null;
  user: AppUser | null;
  loading: boolean;
  isGuest: boolean;
  authConfig: AuthConfig | null;
  signInWithCredentials: (username: string, password: string) => Promise<void>;
  signUpWithCredentials: (username: string, password: string, email?: string) => Promise<void>;
  sendEmailCode: (email: string) => Promise<boolean>;
  signInWithEmailCode: (email: string, code: string) => Promise<void>;
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
  const [authConfig, setAuthConfig] = useState<AuthConfig | null>(null);
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
      // 获取认证配置
      try {
        const config = await authApi.getConfig();
        setAuthConfig(config);
      } catch {
        setAuthConfig({ email_login_enabled: false });
      }

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

  const signInWithCredentials = async (username: string, password: string) => {
    try {
      const response = await authApi.login(username, password);
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
        description: error instanceof Error ? error.message : "请检查您的用户名和密码",
        variant: "destructive",
      });
    }
  };

  const signUpWithCredentials = async (username: string, password: string, email?: string) => {
    try {
      const response = await authApi.register(username, password, email);
      const appUser = createOnlineUser(response.user);
      
      setUser(appUser);
      setSession({
        access_token: response.token,
        user: appUser,
      });
      setIsGuest(false);
      
      toast({
        title: "注册成功",
        description: "欢迎使用蜗牛待办！",
      });

      navigate('/');
    } catch (error) {
      toast({
        title: "注册失败",
        description: error instanceof Error ? error.message : "请稍后再试",
        variant: "destructive",
      });
    }
  };

  const sendEmailCode = async (email: string): Promise<boolean> => {
    try {
      await authApi.sendEmailCode(email);
      toast({
        title: "验证码已发送",
        description: "请查收您的邮箱",
      });
      return true;
    } catch (error) {
      toast({
        title: "发送失败",
        description: error instanceof Error ? error.message : "请稍后再试",
        variant: "destructive",
      });
      return false;
    }
  };

  const signInWithEmailCode = async (email: string, code: string) => {
    try {
      const response = await authApi.emailLogin(email, code);
      const appUser = createOnlineUser(response.user);
      
      setUser(appUser);
      setSession({
        access_token: response.token,
        user: appUser,
      });
      setIsGuest(false);

      toast({
        title: "登录成功",
        description: "欢迎使用蜗牛待办！",
      });

      navigate('/');
    } catch (error) {
      toast({
        title: "登录失败",
        description: error instanceof Error ? error.message : "验证码无效或已过期",
        variant: "destructive",
      });
    }
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
        authConfig,
        signInWithCredentials,
        signUpWithCredentials,
        sendEmailCode,
        signInWithEmailCode,
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
