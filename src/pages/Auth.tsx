import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GoogleIcon, GitHubIcon } from "@/components/ui/icons";
import { useAuth } from "@/contexts/AuthContext";
import { Label } from "@/components/ui/label";
import { WifiOff } from "lucide-react";
import { setStorageMode } from "@/config/storage";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signInWithEmail, signUpWithEmail, signInWithOAuth, signInAsGuest, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // capture redirect param
    const params = new URLSearchParams(location.search);
    const redirect = params.get('redirect');
    if (redirect) {
      try { localStorage.setItem('post_login_redirect', redirect); } catch {}
    }
    // If user is already logged in, redirect to home or pending redirect
    if (user) {
      let target: string | null = null;
      try { target = localStorage.getItem('post_login_redirect'); } catch {}
      if (target) {
        try { localStorage.removeItem('post_login_redirect'); } catch {}
        navigate(target, { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [user, navigate, location.search]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await signInWithEmail(email, password);
    setIsLoading(false);
    let target: string | null = null;
    try { target = localStorage.getItem('post_login_redirect'); } catch {}
    if (target) {
      try { localStorage.removeItem('post_login_redirect'); } catch {}
      navigate(target, { replace: true });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await signUpWithEmail(email, password);
    setIsLoading(false);
  };

  const handleOAuthSignIn = async (provider: 'github' | 'google') => {
    setIsLoading(true);
    await signInWithOAuth(provider);
    setIsLoading(false);
  };

  const handleGuestSignIn = async () => {
    setIsLoading(true);
    await signInAsGuest();
    setIsLoading(false);
    let target: string | null = null;
    try { target = localStorage.getItem('post_login_redirect'); } catch {}
    if (target) {
      try { localStorage.removeItem('post_login_redirect'); } catch {}
      navigate(target, { replace: true });
    }
  };

  const handleOfflineMode = () => {
    setStorageMode("offline");
    navigate("/", { replace: true });
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">蜗牛待办</CardTitle>
          <CardDescription className="text-center">
            请登录以管理您的任务清单
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login">登录</TabsTrigger>
              <TabsTrigger value="register">注册</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <form onSubmit={handleSignIn}>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email">电子邮箱</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">密码</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading ? "登录中..." : "登录"}
                  </Button>
                </div>
              </form>
            </TabsContent>
            <TabsContent value="register">
              <form onSubmit={handleSignUp}>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email">电子邮箱</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">密码</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading ? "注册中..." : "注册"}
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>

          <Button 
            variant="ghost" 
            className="w-full mt-4"
            onClick={handleGuestSignIn}
            disabled={isLoading}
          >
            以游客身份使用
          </Button>

          <Button
            variant="outline"
            className="w-full mt-2"
            onClick={handleOfflineMode}
            disabled={isLoading}
          >
            <WifiOff className="mr-2 h-4 w-4" />
            离线模式
          </Button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">或者使用</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              type="button"
              onClick={() => handleOAuthSignIn('github')}
              disabled={isLoading}
            >
              <GitHubIcon className="mr-2 h-4 w-4" />
              GitHub
            </Button>
            <Button
              variant="outline"
              type="button"
              onClick={() => handleOAuthSignIn('google')}
              disabled={isLoading}
            >
              <GoogleIcon className="mr-2 h-4 w-4" />
              Google
            </Button>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-xs text-gray-500">
            登录即表示您同意我们的服务条款和隐私政策
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Auth;
