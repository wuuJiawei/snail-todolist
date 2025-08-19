import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // 处理OAuth回调中的认证
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Authentication error:", error);
          setError(`认证错误: ${error.message}`);
          // 等待2秒后重定向到登录页面
          setTimeout(() => {
            navigate("/auth", { replace: true });
          }, 2000);
          return;
        }

        if (data.session) {
          console.log("Session established successfully");
          // 成功获取session，重定向到首页
          navigate("/", { replace: true });
        } else {
          // 如果没有session，尝试从URL片段中获取token
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          
          if (accessToken) {
            // 如果有token，手动设置session
            const { error: setSessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || ''
            });
            
            if (setSessionError) {
              console.error("Failed to set session:", setSessionError);
              setError(`设置会话失败: ${setSessionError.message}`);
              setTimeout(() => {
                navigate("/auth", { replace: true });
              }, 2000);
            } else {
              navigate("/", { replace: true });
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
