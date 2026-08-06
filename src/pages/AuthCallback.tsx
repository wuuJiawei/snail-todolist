import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { getAuthSession, setAuthSession } from "@/data/operations";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // 处理OAuth回调中的认证
        const session = await getAuthSession();

        if (session) {
          console.log("Session established successfully");
          // 成功获取session，优先跳转到待处理重定向
          let target: string | null = null;
          try { target = localStorage.getItem('post_login_redirect'); } catch { /* storage may be unavailable */ }
          if (target) {
            try { localStorage.removeItem('post_login_redirect'); } catch { /* storage may be unavailable */ }
            navigate(target, { replace: true });
          } else {
            navigate("/", { replace: true });
          }
        } else {
          // 如果没有session，尝试从URL片段中获取token
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          
          if (accessToken) {
            // 如果有token，手动设置session
            try {
              await setAuthSession(accessToken, refreshToken || "");
              navigate("/", { replace: true });
            } catch (sessionError) {
              console.error("Failed to set session:", sessionError);
              setError(`设置会话失败: ${sessionError instanceof Error ? sessionError.message : "未知错误"}`);
              setTimeout(() => {
                navigate("/auth", { replace: true });
              }, 2000);
            }
          } else {
            console.warn("No session and no tokens found");
            setError("未找到有效的认证信息");
            setTimeout(() => {
              navigate("/auth", { replace: true });
            }, 2000);
          }
        }
      } catch (err) {
        console.error("Unexpected error during auth callback:", err);
        setError("处理认证回调时发生意外错误");
        setTimeout(() => {
          navigate("/auth", { replace: true });
        }, 2000);
      }
    };

    // 给Supabase一点时间处理OAuth回调，然后检查会话
    const timer = setTimeout(() => {
      handleAuthCallback();
    }, 1000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center h-screen px-4">
      <Loader2 className="h-8 w-8 animate-spin text-brand-orange mb-4" />
      <p className="text-lg mb-2">正在完成登录，请稍候...</p>
      {error && (
        <div className="text-red-500 text-center max-w-md">
          <p>{error}</p>
          <p className="text-sm mt-2">正在重定向到登录页面...</p>
        </div>
      )}
    </div>
  );
};

export default AuthCallback;
