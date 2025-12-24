
import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { isOfflineMode } from "@/storage";

interface AuthRouteProps {
  children?: React.ReactNode;
}

const AuthRoute: React.FC<AuthRouteProps> = ({ children }) => {
  const { user, loading, isGuest } = useAuth();

  // In offline mode, always allow access (no auth required)
  if (isOfflineMode) {
    return children ? <>{children}</> : <Outlet />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-brand-orange" />
        <span className="ml-2">加载中...</span>
      </div>
    );
  }

  // 如果用户已登录或是游客模式，允许访问
  if (!user && !isGuest) {
    return <Navigate to="/auth" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default AuthRoute;
