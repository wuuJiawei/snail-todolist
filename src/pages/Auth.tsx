import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { Label } from "@/components/ui/label";
import { WifiOff, Mail, Loader2 } from "lucide-react";
import { setStorageMode } from "@/config/storage";
import { navigateWithReload } from "@/utils/runtime";
import { Separator } from "@/components/ui/separator";

const Auth = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [emailForLogin, setEmailForLogin] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  const { 
    signInWithCredentials, 
    signUpWithCredentials, 
    sendEmailCode,
    signInWithEmailCode,
    user,
    authConfig 
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const redirect = params.get('redirect');
    if (redirect) {
      try { localStorage.setItem('post_login_redirect', redirect); } catch {}
    }
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

  // 倒计时
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await signInWithCredentials(username, password);
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
    await signUpWithCredentials(username, password, email || undefined);
    setIsLoading(false);
  };

  const handleSendCode = async () => {
    if (!emailForLogin || countdown > 0) return;
    setIsSendingCode(true);
    const success = await sendEmailCode(emailForLogin);
    setIsSendingCode(false);
    if (success) {
      setCodeSent(true);
      setCountdown(60);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await signInWithEmailCode(emailForLogin, verificationCode);
    setIsLoading(false);
  };

  const handleOfflineMode = () => {
    setStorageMode("offline");
    navigateWithReload("/");
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
                    <Label htmlFor="login-username">用户名或邮箱</Label>
                    <Input
                      id="login-username"
                      type="text"
                      placeholder="请输入用户名或邮箱"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="login-password">密码</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="请输入密码"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        登录中...
                      </>
                    ) : "登录"}
                  </Button>
                </div>
              </form>
            </TabsContent>
            
            <TabsContent value="register">
              <form onSubmit={handleSignUp}>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="reg-username">用户名 *</Label>
                    <Input
                      id="reg-username"
                      type="text"
                      placeholder="3-50个字符，字母数字下划线"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      minLength={3}
                      maxLength={50}
                      pattern="[a-zA-Z0-9_]+"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="reg-password">密码 *</Label>
                    <Input
                      id="reg-password"
                      type="password"
                      placeholder="至少6个字符"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="reg-email">邮箱（可选）</Label>
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder="用于找回密码"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        注册中...
                      </>
                    ) : "注册"}
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>

          {/* 邮箱一键登录 */}
          {authConfig?.email_login_enabled && (
            <>
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <Separator />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">或者</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid gap-2">
                  <Label htmlFor="email-login">邮箱一键登录</Label>
                  <div className="flex gap-2">
                    <Input
                      id="email-login"
                      type="email"
                      placeholder="请输入邮箱"
                      value={emailForLogin}
                      onChange={(e) => setEmailForLogin(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSendCode}
                      disabled={isSendingCode || countdown > 0 || !emailForLogin}
                      className="shrink-0"
                    >
                      {isSendingCode ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : countdown > 0 ? (
                        `${countdown}s`
                      ) : (
                        "发送验证码"
                      )}
                    </Button>
                  </div>
                </div>
                
                {codeSent && (
                  <form onSubmit={handleEmailLogin} className="space-y-3">
                    <div className="grid gap-2">
                      <Input
                        type="text"
                        placeholder="请输入6位验证码"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        maxLength={6}
                        required
                      />
                    </div>
                    <Button type="submit" disabled={isLoading} className="w-full" variant="secondary">
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          登录中...
                        </>
                      ) : (
                        <>
                          <Mail className="mr-2 h-4 w-4" />
                          验证并登录
                        </>
                      )}
                    </Button>
                  </form>
                )}
                
                <p className="text-xs text-gray-500 text-center">
                  首次使用邮箱登录将自动创建账号
                </p>
              </div>
            </>
          )}

          <Separator className="my-4" />

          <Button
            variant="outline"
            className="w-full"
            onClick={handleOfflineMode}
            disabled={isLoading}
          >
            <WifiOff className="mr-2 h-4 w-4" />
            离线模式
          </Button>
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
