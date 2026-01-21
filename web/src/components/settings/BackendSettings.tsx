import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon-park';
import { toast } from 'sonner';
import { StorageMode, setStorageMode, STORAGE_MODE_KEY, isOnlineMode } from '@/config/storage';
import { settingsApi, SMTPConfig, AppInfoConfig } from '@/lib/authApi';
import { useAuth } from '@/contexts/AuthContext';

const API_BASE_URL_KEY = 'snail_api_base_url';

function getApiBaseUrl(): string {
  try {
    return localStorage.getItem(API_BASE_URL_KEY) || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
  } catch {
    return import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
  }
}

function setApiBaseUrl(url: string): void {
  try {
    localStorage.setItem(API_BASE_URL_KEY, url);
  } catch {
    console.warn('Failed to save API base URL');
  }
}

function getCurrentMode(): StorageMode {
  try {
    const stored = localStorage.getItem(STORAGE_MODE_KEY);
    if (stored === 'offline' || stored === 'online') {
      return stored;
    }
  } catch {}
  return (import.meta.env.VITE_STORAGE_MODE as StorageMode) || 'online';
}

export default function BackendSettings() {
  const [apiUrl, setApiUrl] = useState(getApiBaseUrl());
  const [isOffline, setIsOffline] = useState(getCurrentMode() === 'offline');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const { isAdmin } = useAuth();

  // SMTP 配置
  const [smtpConfig, setSmtpConfig] = useState<SMTPConfig>({
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_password: '',
    smtp_from: '',
    email_login_enabled: false,
  });
  const [smtpLoading, setSmtpLoading] = useState(false);
  const [smtpSaving, setSmtpSaving] = useState(false);

  // 应用信息配置
  const [appInfo, setAppInfo] = useState<AppInfoConfig>({
    app_name: '',
    app_description: '',
    app_logo_url: '',
    developer_name: '',
    contact_email: '',
    contact_website: '',
    features: [],
  });
  const [appInfoLoading, setAppInfoLoading] = useState(false);
  const [appInfoSaving, setAppInfoSaving] = useState(false);
  const [featuresText, setFeaturesText] = useState('');

  useEffect(() => {
    const savedUrl = getApiBaseUrl();
    const savedMode = getCurrentMode();
    setHasChanges(apiUrl !== savedUrl || isOffline !== (savedMode === 'offline'));
  }, [apiUrl, isOffline]);

  useEffect(() => {
    if (isOnlineMode && isAdmin) {
      loadSMTPConfig();
      loadAppInfo();
    }
  }, [isAdmin]);

  const loadSMTPConfig = async () => {
    setSmtpLoading(true);
    try {
      const config = await settingsApi.getSMTPConfig();
      setSmtpConfig(config);
    } catch {
      // 忽略错误，使用默认值
    } finally {
      setSmtpLoading(false);
    }
  };

  const loadAppInfo = async () => {
    setAppInfoLoading(true);
    try {
      const info = await settingsApi.getAppInfo();
      setAppInfo(info);
      setFeaturesText(info.features.join('\n'));
    } catch {
      // 忽略错误
    } finally {
      setAppInfoLoading(false);
    }
  };

  const handleSaveSMTP = async () => {
    setSmtpSaving(true);
    try {
      await settingsApi.updateSMTPConfig(smtpConfig);
      toast.success('SMTP 配置已保存');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败');
    } finally {
      setSmtpSaving(false);
    }
  };

  const handleSaveAppInfo = async () => {
    setAppInfoSaving(true);
    try {
      const features = featuresText.split('\n').map(f => f.trim()).filter(Boolean);
      await settingsApi.updateAppInfo({ ...appInfo, features });
      toast.success('应用信息已保存');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败');
    } finally {
      setAppInfoSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch(`${apiUrl}/api/v1/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        setTestResult('success');
        toast.success('连接成功');
      } else {
        setTestResult('error');
        toast.error('连接失败：服务器返回错误');
      }
    } catch {
      setTestResult('error');
      toast.error('连接失败：无法连接到服务器');
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    setApiBaseUrl(apiUrl);
    setStorageMode(isOffline ? 'offline' : 'online');
    setHasChanges(false);
    toast.success('设置已保存，刷新页面后生效');
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">后端设置</h3>
        <p className="text-sm text-muted-foreground">配置数据存储方式和后端服务器地址</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">存储模式</CardTitle>
          <CardDescription>选择数据存储方式</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>离线模式</Label>
              <p className="text-sm text-muted-foreground">
                {isOffline ? '数据存储在本地浏览器中' : '数据同步到云端服务器'}
              </p>
            </div>
            <Switch checked={isOffline} onCheckedChange={setIsOffline} />
          </div>
        </CardContent>
      </Card>

      {!isOffline && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">后端服务器</CardTitle>
            <CardDescription>配置自定义后端服务器地址</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-url">API 地址</Label>
              <div className="flex gap-2">
                <Input
                  id="api-url"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="http://localhost:8080"
                />
                <Button variant="outline" onClick={handleTestConnection} disabled={testing}>
                  {testing ? (
                    <Icon icon="loading-one" className="h-4 w-4 animate-spin" />
                  ) : (
                    <Icon icon="connection-point" className="h-4 w-4" />
                  )}
                  <span className="ml-2">测试</span>
                </Button>
              </div>
              {testResult === 'success' && (
                <p className="text-sm text-green-600 flex items-center gap-1">
                  <Icon icon="check-one" className="h-4 w-4" />
                  连接成功
                </p>
              )}
              {testResult === 'error' && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <Icon icon="close-one" className="h-4 w-4" />
                  连接失败
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {hasChanges && (
        <div className="flex gap-2">
          <Button onClick={handleSave}>保存设置</Button>
          <Button variant="outline" onClick={handleReload}>
            刷新页面应用更改
          </Button>
        </div>
      )}

      {!isOffline && isOnlineMode && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">邮件服务 (SMTP)</CardTitle>
            <CardDescription>配置邮箱验证码登录功能</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {smtpLoading ? (
              <div className="flex items-center justify-center py-4">
                <Icon icon="loading-one" className="h-5 w-5 animate-spin" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>启用邮箱登录</Label>
                    <p className="text-sm text-muted-foreground">允许用户使用邮箱验证码登录</p>
                  </div>
                  <Switch
                    checked={smtpConfig.email_login_enabled}
                    onCheckedChange={(checked) =>
                      setSmtpConfig((prev) => ({ ...prev, email_login_enabled: checked }))
                    }
                  />
                </div>

                <div className="grid gap-4 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="smtp-host">SMTP 服务器</Label>
                      <Input
                        id="smtp-host"
                        value={smtpConfig.smtp_host}
                        onChange={(e) =>
                          setSmtpConfig((prev) => ({ ...prev, smtp_host: e.target.value }))
                        }
                        placeholder="smtp.example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtp-port">端口</Label>
                      <Input
                        id="smtp-port"
                        type="number"
                        value={smtpConfig.smtp_port}
                        onChange={(e) =>
                          setSmtpConfig((prev) => ({ ...prev, smtp_port: parseInt(e.target.value) || 587 }))
                        }
                        placeholder="587"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="smtp-user">用户名</Label>
                    <Input
                      id="smtp-user"
                      value={smtpConfig.smtp_user}
                      onChange={(e) =>
                        setSmtpConfig((prev) => ({ ...prev, smtp_user: e.target.value }))
                      }
                      placeholder="your-email@example.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="smtp-password">密码</Label>
                    <Input
                      id="smtp-password"
                      type="password"
                      value={smtpConfig.smtp_password}
                      onChange={(e) =>
                        setSmtpConfig((prev) => ({ ...prev, smtp_password: e.target.value }))
                      }
                      placeholder="留空则不修改"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="smtp-from">发件人地址</Label>
                    <Input
                      id="smtp-from"
                      value={smtpConfig.smtp_from}
                      onChange={(e) =>
                        setSmtpConfig((prev) => ({ ...prev, smtp_from: e.target.value }))
                      }
                      placeholder="noreply@example.com"
                    />
                  </div>

                  <Button onClick={handleSaveSMTP} disabled={smtpSaving}>
                    {smtpSaving && <Icon icon="loading-one" className="mr-2 h-4 w-4 animate-spin" />}
                    保存 SMTP 配置
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {!isOffline && isOnlineMode && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">应用信息</CardTitle>
            <CardDescription>配置关于页面显示的应用信息</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {appInfoLoading ? (
              <div className="flex items-center justify-center py-4">
                <Icon icon="loading-one" className="h-5 w-5 animate-spin" />
              </div>
            ) : (
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="app-name">应用名称</Label>
                    <Input
                      id="app-name"
                      value={appInfo.app_name}
                      onChange={(e) => setAppInfo((prev) => ({ ...prev, app_name: e.target.value }))}
                      placeholder="蜗牛清单"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="developer-name">开发者</Label>
                    <Input
                      id="developer-name"
                      value={appInfo.developer_name}
                      onChange={(e) => setAppInfo((prev) => ({ ...prev, developer_name: e.target.value }))}
                      placeholder="SnailTodo Team"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="app-description">应用描述</Label>
                  <Input
                    id="app-description"
                    value={appInfo.app_description}
                    onChange={(e) => setAppInfo((prev) => ({ ...prev, app_description: e.target.value }))}
                    placeholder="一款简洁高效的任务管理应用"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="app-logo">Logo URL</Label>
                  <Input
                    id="app-logo"
                    value={appInfo.app_logo_url}
                    onChange={(e) => setAppInfo((prev) => ({ ...prev, app_logo_url: e.target.value }))}
                    placeholder="https://example.com/logo.png"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contact-email">联系邮箱</Label>
                    <Input
                      id="contact-email"
                      type="email"
                      value={appInfo.contact_email}
                      onChange={(e) => setAppInfo((prev) => ({ ...prev, contact_email: e.target.value }))}
                      placeholder="contact@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact-website">官网地址</Label>
                    <Input
                      id="contact-website"
                      value={appInfo.contact_website}
                      onChange={(e) => setAppInfo((prev) => ({ ...prev, contact_website: e.target.value }))}
                      placeholder="https://example.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="features">功能介绍（每行一条）</Label>
                  <Textarea
                    id="features"
                    value={featuresText}
                    onChange={(e) => setFeaturesText(e.target.value)}
                    placeholder="创建和管理任务清单&#10;设置任务截止日期&#10;标记重要任务"
                    rows={6}
                  />
                </div>

                <Button onClick={handleSaveAppInfo} disabled={appInfoSaving}>
                  {appInfoSaving && <Icon icon="loading-one" className="mr-2 h-4 w-4 animate-spin" />}
                  保存应用信息
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
