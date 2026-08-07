import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon-park";
import { ExternalLink, MessageCircle } from "lucide-react";
import { GitHubIcon } from "@/components/ui/icons";
import { getAppVersion } from "@/utils/version";
import { AppInfo, AppVersion } from "@/types/app";
import { Skeleton } from "@/components/ui/skeleton";
import * as storageOps from "@/data/operations";

const GITHUB_REPOSITORY_URL = "https://github.com/wuuJiawei/snail-todolist";
const GITHUB_ISSUES_URL = `${GITHUB_REPOSITORY_URL}/issues`;
const GITHUB_LOGO_URL = "https://raw.githubusercontent.com/wuuJiawei/snail-todolist/main/public/logo.png";

const DEFAULT_APP_INFO: AppInfo = {
  id: 1,
  app_name: "蜗牛清单",
  app_description: "面向日常工作与个人事务的任务管理工具",
  app_logo_url: GITHUB_LOGO_URL,
  developer_name: "SnailTodo Team",
  contact_email: null,
  contact_website: null,
  features: [
    "创建和管理任务清单",
    "设置任务截止日期",
    "标记重要任务",
    "番茄钟专注计时",
    "每日签到打卡",
    "多设备数据同步",
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
          ...DEFAULT_APP_INFO,
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
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">关于</h1>
        <p className="mt-1 text-sm text-muted-foreground">了解蜗牛清单，以及项目的开源信息。</p>
      </div>

      <Card>
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-brand-orange/10 p-1">
                <img
                  src={appInfo.app_logo_url || GITHUB_LOGO_URL}
                  alt={`${appInfo.app_name} logo`}
                  className="h-full w-full rounded-xl object-cover"
                />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-2xl">{appInfo.app_name}</CardTitle>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    v{version.version}
                  </span>
                </div>
                <CardDescription className="mt-2 max-w-xl">{appInfo.app_description}</CardDescription>
              </div>
            </div>
            <Button variant="outline" asChild className="shrink-0">
              <a href={GITHUB_REPOSITORY_URL} target="_blank" rel="noopener noreferrer">
                <GitHubIcon className="h-4 w-4" />
                <span>GitHub 仓库</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">功能介绍</CardTitle>
            <CardDescription>把任务、时间和专注安排在一个地方。</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-1">
              {appInfo.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-2">
                  <Icon icon="check-one" className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">应用信息</CardTitle>
            <CardDescription>当前版本与项目维护信息。</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">版本</p>
              <p className="mt-1 font-medium">{version.version}</p>
            </div>
            <div>
              <p className="text-muted-foreground">开发者</p>
              <p className="mt-1 font-medium">{appInfo.developer_name}</p>
            </div>
            <div>
              <p className="text-muted-foreground">项目地址</p>
              <a
                href={GITHUB_REPOSITORY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-blue-600 hover:underline"
              >
                github.com/wuuJiawei/snail-todolist
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              </a>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">支持与反馈</CardTitle>
          <CardDescription>发现问题或有改进建议，可以直接在 GitHub 留言。</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Button variant="outline" asChild>
            <a href={GITHUB_REPOSITORY_URL} target="_blank" rel="noopener noreferrer">
              <GitHubIcon className="h-4 w-4" />
              查看项目
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href={GITHUB_ISSUES_URL} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-4 w-4" />
              问题反馈
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AboutSettings;
