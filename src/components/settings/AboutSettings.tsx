import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon-park";
import { getAppVersion } from "@/utils/version";
import { AppInfo, AppVersion } from "@/types/app";
import { Skeleton } from "@/components/ui/skeleton";
import { isOfflineMode } from "@/storage";
import * as storageOps from "@/storage/operations";

// Static app info for offline mode
const OFFLINE_APP_INFO: AppInfo = {
  id: 1,
  app_name: "蜗牛清单",
  app_description: "一款简洁高效的任务管理应用",
  app_logo_url: null,
  developer_name: "SnailTodo Team",
  contact_email: null,
  contact_website: null,
  features: [
    "创建和管理任务清单",
    "设置任务截止日期",
    "标记重要任务",
    "番茄钟专注计时",
    "每日签到打卡",
    "离线模式支持",
  ],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const AboutSettings = () => {
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [version] = useState<AppVersion>(getAppVersion());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAppInfo = async () => {
      try {
        setLoading(true);
        
        const info = await storageOps.getAppInfo();
        // Merge with default app info to ensure all fields are present
        setAppInfo({
          ...OFFLINE_APP_INFO,
          ...info,
        });
      } catch (err) {
        console.error('获取应用信息时发生错误:', err);
        setError('获取应用信息时发生错误');
      } finally {
        setLoading(false);
      }
    };

    fetchAppInfo();
  }, []);

  if (loading) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold mb-6">关于</h1>
        
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center gap-4">
            <Skeleton className="w-[60px] h-[60px] rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Skeleton className="h-4 w-16 mb-1" />
                <Skeleton className="h-3 w-20" />
              </div>
              <div>
                <Skeleton className="h-4 w-16 mb-1" />
                <Skeleton className="h-3 w-24" />
              </div>
              <div>
                <Skeleton className="h-4 w-16 mb-1" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-24" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !appInfo) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold mb-6">关于</h1>
        
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Icon icon="warning" className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
              <p className="text-muted-foreground">
                {error || '无法获取应用信息，请稍后重试'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">关于</h1>
      
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center gap-4">
          <div className="bg-brand-orange bg-opacity-10 p-3 rounded-full">
            {appInfo.app_logo_url ? (
              <img 
                src={appInfo.app_logo_url} 
                alt="App Logo" 
                className="w-9 h-9 object-cover rounded-full"
              />
            ) : (
              <Icon 
                icon="snail" 
                size={36} 
                className="text-brand-orange" 
              />
            )}
          </div>
          <div>
            <CardTitle className="text-2xl">{appInfo.app_name}</CardTitle>
            <CardDescription>{appInfo.app_description}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium">版本</h3>
              <p className="text-sm text-gray-500">{version.version}</p>
            </div>
            
            <div>
              <h3 className="font-medium">开发者</h3>
              <p className="text-sm text-gray-500">{appInfo.developer_name}</p>
            </div>
            
            {!isOfflineMode && (appInfo.contact_email || appInfo.contact_website) && (
              <div>
                <h3 className="font-medium">联系我们</h3>
                <div className="space-y-1">
                  {appInfo.contact_email && (
                    <p className="text-sm text-gray-500">
                      邮箱：
                      <a 
                        href={`mailto:${appInfo.contact_email}`}
                        className="text-blue-600 hover:underline ml-1"
                      >
                        {appInfo.contact_email}
                      </a>
                    </p>
                  )}
                  {appInfo.contact_website && (
                    <p className="text-sm text-gray-500">
                      网站：
                      <a 
                        href={appInfo.contact_website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline ml-1"
                      >
                        {appInfo.contact_website}
                      </a>
                    </p>
                  )}
                </div>
              </div>
            )}

            {isOfflineMode && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                <p className="text-sm text-amber-700">
                  当前处于离线模式，数据存储在本地设备上。
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>功能介绍</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {appInfo.features.map((feature, index) => (
              <li key={index} className="flex items-start gap-2">
                <Icon icon="check-one" className="text-green-500 mt-0.5 flex-shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default AboutSettings;
