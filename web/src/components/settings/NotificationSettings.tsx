import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, Send, Bell } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getDeadlineConfig, saveDeadlineConfig, requestNotificationPermission } from "@/services/deadlineService";
import * as storageOps from "@/storage/operations";

type WebhookType = "feishu" | "dingtalk" | "custom";

interface WebhookConfig {
  enabled: boolean;
  type: WebhookType;
  url: string;
  secret?: string;
}

interface DeadlineConfig {
  enabled: boolean;
  reminderMinutes: number;
  webhookEnabled: boolean;
  browserNotificationEnabled: boolean;
}

// Validate if a string is a valid URL
const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const NotificationSettings = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [webhookConfig, setWebhookConfig] = useState<WebhookConfig>({
    enabled: false,
    type: "feishu",
    url: "",
    secret: "",
  });
  
  const [deadlineConfig, setDeadlineConfig] = useState<DeadlineConfig>({
    enabled: false,
    reminderMinutes: 30,
    webhookEnabled: false,
    browserNotificationEnabled: true,
  });

  // Load configurations from user metadata
  useEffect(() => {
    const loadSettings = async () => {
      // Load webhook config from user settings
      const settings = await storageOps.getUserSettings();
      if (settings.webhook_url) {
        setWebhookConfig({
          enabled: settings.webhook_enabled || false,
          type: (settings.webhook_type as WebhookType) || "feishu",
          url: settings.webhook_url || "",
          secret: settings.webhook_secret || "",
        });
      }
      
      // Load deadline configuration
      const config = await getDeadlineConfig();
      setDeadlineConfig(config);
    };

    loadSettings();
  }, [user]);

  // Function to test the webhook
  const testWebhook = async () => {
    if (!webhookConfig.enabled || !webhookConfig.url.trim()) {
      toast({
        title: "测试失败",
        description: "请先启用 Webhook 并输入有效的 URL",
        variant: "destructive",
      });
      return;
    }

    if (!isValidUrl(webhookConfig.url)) {
      toast({
        title: "测试失败",
        description: "请输入有效的 URL 格式",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);

    try {
      // Here we would typically call a backend API to send a test message
      // For now, we'll simulate an API call with a timeout
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast({
        title: "测试消息已发送",
        description: "如果配置正确，您应该会收到一条测试消息",
      });
    } catch (error) {
      toast({
        title: "测试失败",
        description: "发送测试消息时出错",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Test browser notification permission
  const testBrowserNotification = async () => {
    try {
      const permission = await requestNotificationPermission();
      
      if (permission === "granted") {
        new Notification("通知测试", {
          body: "恭喜！您的浏览器通知设置正常工作。",
          icon: '/favicon.ico',
        });
        
        toast({
          title: "测试成功",
          description: "浏览器通知已发送",
        });
      } else {
        toast({
          title: "权限被拒绝",
          description: "请在浏览器设置中允许通知权限",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "测试失败",
        description: "浏览器不支持通知功能",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate webhook URL if enabled
      if (webhookConfig.enabled) {
        if (!webhookConfig.url.trim()) {
          throw new Error('请输入 Webhook URL');
        }

        if (!isValidUrl(webhookConfig.url)) {
          throw new Error('请输入有效的 URL 格式');
        }
      }

      // Save both webhook and deadline configurations
      const [, deadlineResult] = await Promise.all([
        // Save webhook configuration via storageOps
        storageOps.saveUserSettings({
          webhook_enabled: webhookConfig.enabled,
          webhook_type: webhookConfig.type,
          webhook_url: webhookConfig.url,
          webhook_secret: webhookConfig.secret,
        }),
        // Save deadline configuration
        saveDeadlineConfig(deadlineConfig)
      ]);

      if (!deadlineResult) {
        throw new Error('Failed to save deadline config');
      }

      toast({
        title: "通知设置已更新",
        description: "您的通知设置已成功保存",
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      toast({
        title: "更新失败",
        description: errorMessage || "无法更新通知设置",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">通知设置</h1>
      
      <div className="space-y-6">
        {/* 截止时间通知设置 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              截止时间提醒
            </CardTitle>
            <CardDescription>
              为即将截止的任务设置提前提醒
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="deadline-enabled"
                  checked={deadlineConfig.enabled}
                  onCheckedChange={(checked) =>
                    setDeadlineConfig(prev => ({ ...prev, enabled: checked }))
                  }
                />
                <Label htmlFor="deadline-enabled">启用截止时间提醒</Label>
              </div>

              {deadlineConfig.enabled && (
                <div className="space-y-4 pl-6 border-l-2 border-gray-100">
                  <div>
                    <Label htmlFor="reminder-time">提前提醒时间</Label>
                    <Select
                      value={deadlineConfig.reminderMinutes.toString()}
                      onValueChange={(value) =>
                        setDeadlineConfig(prev => ({ ...prev, reminderMinutes: parseInt(value) }))
                      }
                    >
                      <SelectTrigger className="w-full mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">提前 5 分钟</SelectItem>
                        <SelectItem value="10">提前 10 分钟</SelectItem>
                        <SelectItem value="15">提前 15 分钟</SelectItem>
                        <SelectItem value="30">提前 30 分钟</SelectItem>
                        <SelectItem value="60">提前 1 小时</SelectItem>
                        <SelectItem value="120">提前 2 小时</SelectItem>
                        <SelectItem value="1440">提前 1 天</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="browser-notification"
                      checked={deadlineConfig.browserNotificationEnabled}
                      onCheckedChange={(checked) =>
                        setDeadlineConfig(prev => ({ ...prev, browserNotificationEnabled: checked }))
                      }
                    />
                    <Label htmlFor="browser-notification">浏览器通知</Label>
                    {deadlineConfig.browserNotificationEnabled && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={testBrowserNotification}
                      >
                        测试
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="webhook-deadline"
                      checked={deadlineConfig.webhookEnabled}
                      onCheckedChange={(checked) =>
                        setDeadlineConfig(prev => ({ ...prev, webhookEnabled: checked }))
                      }
                    />
                    <Label htmlFor="webhook-deadline">
                      Webhook 通知 
                      <span className="text-sm text-gray-500 ml-1">
                        (需先配置下方 Webhook 设置)
                      </span>
                    </Label>
                  </div>
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Webhook 通知设置 */}
        <Card>
          <CardHeader>
            <CardTitle>Webhook 通知</CardTitle>
            <CardDescription>
              配置 Webhook 以接收任务提醒和其他通知
            </CardDescription>
          </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center space-x-2">
              <Switch
                id="webhook-enabled"
                checked={webhookConfig.enabled}
                onCheckedChange={(checked) =>
                  setWebhookConfig(prev => ({ ...prev, enabled: checked }))
                }
              />
              <Label htmlFor="webhook-enabled">启用 Webhook 通知</Label>
            </div>

            {webhookConfig.enabled && (
              <Tabs
                defaultValue={webhookConfig.type}
                value={webhookConfig.type}
                onValueChange={(value) =>
                  setWebhookConfig(prev => ({ ...prev, type: value as WebhookType }))
                }
              >
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="feishu">飞书</TabsTrigger>
                  <TabsTrigger value="dingtalk">钉钉</TabsTrigger>
                  <TabsTrigger value="custom">自定义</TabsTrigger>
                </TabsList>

                <TabsContent value="feishu" className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="feishu-url">飞书 Webhook URL</Label>
                    <Input
                      id="feishu-url"
                      placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/..."
                      value={webhookConfig.url}
                      onChange={(e) =>
                        setWebhookConfig(prev => ({ ...prev, url: e.target.value }))
                      }
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      在飞书群聊中添加自定义机器人获取 Webhook 地址
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="feishu-secret">安全设置（可选）</Label>
                    <Input
                      id="feishu-secret"
                      placeholder="飞书机器人安全设置中的签名密钥"
                      value={webhookConfig.secret || ""}
                      onChange={(e) =>
                        setWebhookConfig(prev => ({ ...prev, secret: e.target.value }))
                      }
                    />
                  </div>
                </TabsContent>

                <TabsContent value="dingtalk" className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="dingtalk-url">钉钉 Webhook URL</Label>
                    <Input
                      id="dingtalk-url"
                      placeholder="https://oapi.dingtalk.com/robot/send?access_token=..."
                      value={webhookConfig.url}
                      onChange={(e) =>
                        setWebhookConfig(prev => ({ ...prev, url: e.target.value }))
                      }
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      在钉钉群聊中添加自定义机器人获取 Webhook 地址
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="dingtalk-secret">安全设置（可选）</Label>
                    <Input
                      id="dingtalk-secret"
                      placeholder="钉钉机器人安全设置中的签名密钥"
                      value={webhookConfig.secret || ""}
                      onChange={(e) =>
                        setWebhookConfig(prev => ({ ...prev, secret: e.target.value }))
                      }
                    />
                  </div>
                </TabsContent>

                <TabsContent value="custom" className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="custom-url">自定义 Webhook URL</Label>
                    <Input
                      id="custom-url"
                      placeholder="https://your-webhook-url.com/..."
                      value={webhookConfig.url}
                      onChange={(e) =>
                        setWebhookConfig(prev => ({ ...prev, url: e.target.value }))
                      }
                    />
                  </div>
                </TabsContent>
              </Tabs>
            )}

            <div className="flex space-x-2">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    保存中...
                  </>
                ) : (
                  "保存设置"
                )}
              </Button>

              {webhookConfig.enabled && webhookConfig.url && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={testWebhook}
                  disabled={isLoading || isTesting}
                >
                  {isTesting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      测试中...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      测试发送
                    </>
                  )}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
      
      {/* 统一保存按钮 */}
      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading} onClick={handleSubmit}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              保存中...
            </>
          ) : (
            "保存所有设置"
          )}
        </Button>
      </div>
      </div>
    </div>
  );
};

export default NotificationSettings;
