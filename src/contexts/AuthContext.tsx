
import React, { createContext, useContext, useEffect, useState } from "react";
import type { AuthSession, AuthUser } from "@/data/contracts/authRepository";
import {
  getAuthSession,
  getCurrentUser,
  migrateGuestData,
  signInWithOAuth as dataSignInWithOAuth,
  signInWithPassword,
  signOut as dataSignOut,
  signUp,
  subscribeToAuth,
} from "@/data/operations";
import { isTauriRuntime } from "@/utils/runtime";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

// 游客ID本地存储key
const GUEST_ID_KEY = "snail_guest_id";

// 获取本地存储的游客ID
const getGuestId = (): string | null => {
  return localStorage.getItem(GUEST_ID_KEY);
};

// 清除本地存储的游客ID
const clearGuestId = (): void => {
  localStorage.removeItem(GUEST_ID_KEY);
};

interface AuthContextType {
  session: AuthSession | null;
  user: AuthUser | null;
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
  const [session, setSession] = useState<AuthSession | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const navigate = useNavigate();

  // Track if we've already shown the login toast
  const [hasShownLoginToast, setHasShownLoginToast] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToAuth(
      async (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (event === 'SIGNED_IN' && !hasShownLoginToast) {
          // Only show login toast for explicit sign-in events, not for session recovery
          const isFromAuthCallback = window.location.pathname.includes('/auth/callback');
          if (isFromAuthCallback) {
            toast({
              title: "登录成功",
              description: "欢迎回来！",
            });
            setHasShownLoginToast(true);
            
            // 如果用户登录时有游客数据，迁移数据
            const guestId = getGuestId();
            if (guestId && currentSession?.user) {
              await migrateGuestDataToUser(guestId, currentSession.user.id);
            }
          }
        } else if (event === 'SIGNED_OUT') {
          toast({
            title: "已退出登录",
            description: "期待您的再次使用",
          });
          navigate('/auth');
          setHasShownLoginToast(false);
          setIsGuest(false);
        } else if (event === 'USER_UPDATED') {
          // User metadata has been updated, refresh the user state
          setUser(currentSession?.user ?? null);
        }
      }
    );

    // Then check for existing session - only once
    // Auth state is owned by the repository; this Context only mirrors its lifecycle.
    getAuthSession().then((currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [navigate, hasShownLoginToast]);

  // 将游客数据迁移到正式用户账户
  const migrateGuestDataToUser = async (guestId: string, userId: string) => {
    try {
      // 显示迁移过程提示
      toast({
        title: "数据同步中...",
        description: "正在将您的游客数据同步到您的账户",
      });
      
      // 调用服务端函数迁移数据
      await migrateGuestData(guestId, userId);
      
      // 迁移成功后清除游客ID
      clearGuestId();
      
      // 更新提示信息
      toast({
        title: "数据同步完成",
        description: "您的所有任务已成功同步到您的账户",
      });
    } catch (error) {
      console.error("Error migrating guest data:", error);
      toast({
        title: "数据同步失败",
        description: "无法将游客数据迁移到您的账户，请联系管理员",
        variant: "destructive",
      });
    }
  };

  // Sign in with email and password
  const signInWithEmail = async (email: string, password: string) => {
    try {
      await signInWithPassword(email, password);

      // Show login toast and set flag
      toast({
        title: "登录成功",
        description: "欢迎回来！",
      });
      setHasShownLoginToast(true);
      setIsGuest(false);

      // 如果用户登录时有游客数据，迁移数据
      const user = await getCurrentUser();
      const guestId = getGuestId();
      if (guestId && user) {
        await migrateGuestDataToUser(guestId, user.id);
      }

      navigate('/');
    } catch (error: unknown) {
      toast({
        title: "登录失败",
        description: error instanceof Error ? error.message : "请检查您的邮箱和密码",
        variant: "destructive",
      });
    }
  };

  // Sign up with email and password
  const signUpWithEmail = async (email: string, password: string) => {
    try {
      const createdUser = await signUp(email, password);
      
      toast({
        title: "注册成功",
        description: "请检查您的邮箱以验证账户",
      });
      
      // 如果注册后立即获得用户且有游客数据，迁移数据
      if (createdUser) {
        const guestId = getGuestId();
        if (guestId) {
          await migrateGuestDataToUser(guestId, createdUser.id);
        }
      }
    } catch (error: unknown) {
      toast({
        title: "注册失败",
        description: error instanceof Error ? error.message : "请稍后再试",
        variant: "destructive",
      });
    }
  };

  // Sign in with OAuth provider
  const signInWithOAuth = async (provider: 'github' | 'google') => {
    try {
      const redirectTo = isTauriRuntime()
        ? "snailtodo://auth-callback"
        : `${window.location.origin}/auth/callback`;
      await dataSignInWithOAuth(provider, redirectTo);
    } catch (error: unknown) {
      toast({
        title: "登录失败",
        description: error instanceof Error ? error.message : "请稍后再试",
        variant: "destructive",
      });
    }
  };

  // Sign in as guest
  const signInAsGuest = async () => {
    try {
      // 启用游客模式而不是实际登录
      setIsGuest(true);
      
      toast({
        title: "游客模式",
        description: "您现在以游客身份使用，部分功能可能受限",
      });
      
      navigate('/');
    } catch (error: unknown) {
      toast({
        title: "游客登录失败",
        description: error instanceof Error ? error.message : "请稍后再试",
        variant: "destructive",
      });
    }
  };

  // Sign out
  const signOut = async () => {
    if (isGuest) {
      setIsGuest(false);
      navigate('/auth');
      return;
    }
    
    try {
      await dataSignOut();
    } catch (error) {
      toast({
        title: "退出失败",
        description: error instanceof Error ? error.message : "请稍后再试",
        variant: "destructive",
      });
    }
  };

  // Refresh user data from Supabase
  const refreshUser = async () => {
    if (isGuest) return;
    const freshUser = await getCurrentUser();
    if (freshUser) {
      setUser(freshUser);
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
