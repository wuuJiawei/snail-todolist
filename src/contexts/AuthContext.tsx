
import React, { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { isTauriRuntime } from "@/utils/runtime";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithOAuth: (provider: 'github' | 'google') => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Track if we've already shown the login toast
  const [hasShownLoginToast, setHasShownLoginToast] = useState(false);

  useEffect(() => {
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
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
          }
        } else if (event === 'SIGNED_OUT') {
          toast({
            title: "已退出登录",
            description: "期待您的再次使用",
          });
          navigate('/auth');
          setHasShownLoginToast(false);
        } else if (event === 'USER_UPDATED') {
          // User metadata has been updated, refresh the user state
          setUser(currentSession?.user ?? null);
        }
      }
    );

    // Then check for existing session - only once
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, hasShownLoginToast]);

  // Sign in with email and password
  const signInWithEmail = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // Show login toast and set flag
      toast({
        title: "登录成功",
        description: "欢迎回来！",
      });
      setHasShownLoginToast(true);

      navigate('/');
    } catch (error: any) {
      toast({
        title: "登录失败",
        description: error.message || "请检查您的邮箱和密码",
        variant: "destructive",
      });
    }
  };

  // Sign up with email and password
  const signUpWithEmail = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      toast({
        title: "注册成功",
        description: "请检查您的邮箱以验证账户",
      });
    } catch (error: any) {
      toast({
        title: "注册失败",
        description: error.message || "请稍后再试",
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
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "登录失败",
        description: error.message || "请稍后再试",
        variant: "destructive",
      });
    }
  };

  // Sign out
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "退出失败",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        loading,
        signInWithEmail,
        signUpWithEmail,
        signInWithOAuth,
        signOut,
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
