import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useProjectContext } from "@/contexts/ProjectContext";
import { isOfflineMode } from "@/storage";
import { apiClient } from "@/lib/apiClient";

const JoinSharedProject: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user, isGuest } = useAuth();
  const { refreshProjects } = useProjectContext();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOfflineMode) {
      toast({
        title: "离线模式",
        description: "离线模式下无法加入共享清单",
        variant: "destructive",
      });
      navigate("/", { replace: true });
      return;
    }

    const join = async () => {
      const shareCode = (code || "").toUpperCase();
      if (!shareCode) {
        toast({ title: "无效链接", description: "缺少分享码", variant: "destructive" });
        navigate("/", { replace: true });
        return;
      }

      if (!user || isGuest) {
        try {
          localStorage.setItem("post_login_redirect", location.pathname + location.search);
        } catch {}
        navigate(`/auth?redirect=${encodeURIComponent(location.pathname + location.search)}`, { replace: true });
        return;
      }

      try {
        await apiClient.post('/share/join', { share_code: shareCode });
        await refreshProjects();
        toast({ title: "加入成功", description: "已加入共享清单" });
        navigate("/", { replace: true });
      } catch (err) {
        console.error("join by link error", err);
        const message = err instanceof Error ? err.message : "请稍后再试";
        toast({ title: "加入失败", description: message, variant: "destructive" });
        navigate("/", { replace: true });
      } finally {
        setLoading(false);
      }
    };

    join();
  }, [code, user, isGuest, toast, navigate, location, refreshProjects]);

  return (
    <div className="flex h-full items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>加入共享清单</CardTitle>
          <CardDescription>正在处理您的加入请求...</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              处理中...
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">页面即将跳转</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default JoinSharedProject;
