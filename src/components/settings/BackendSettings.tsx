import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon-park';
import { toast } from 'sonner';
import { StorageMode, setStorageMode, STORAGE_MODE_KEY } from '@/config/storage';

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

  useEffect(() => {
    const savedUrl = getApiBaseUrl();
    const savedMode = getCurrentMode();
    setHasChanges(apiUrl !== savedUrl || isOffline !== (savedMode === 'offline'));
  }, [apiUrl, isOffline]);

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
    </div>
  );
}
