import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // OAuth callback - currently not supported in online mode
    // Redirect to home or auth page
    const timer = setTimeout(() => {
      let target: string | null = null;
      try { 
        target = localStorage.getItem('post_login_redirect'); 
        localStorage.removeItem('post_login_redirect');
      } catch {}
      
      navigate(target || "/", { replace: true });
    }, 1000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center h-screen px-4">
      <Loader2 className="h-8 w-8 animate-spin text-brand-orange mb-4" />
      <p className="text-lg mb-2">正在完成登录，请稍候...</p>
    </div>
  );
};

export default AuthCallback;
