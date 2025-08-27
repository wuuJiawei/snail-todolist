import { Task } from "@/types/task";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ensureNotificationPermission, sendNotification as sendUnifiedNotification } from "@/utils/notifications";

interface DeadlineNotificationConfig {
  enabled: boolean;
  reminderMinutes: number; // 提前多少分钟提醒
  webhookEnabled: boolean;
  browserNotificationEnabled: boolean;
}

// 默认配置
const DEFAULT_CONFIG: DeadlineNotificationConfig = {
  enabled: false,
  reminderMinutes: 30, // 默认提前30分钟提醒
  webhookEnabled: false,
  browserNotificationEnabled: true,
};

// 获取截止时间通知配置
export const getDeadlineConfig = async (): Promise<DeadlineNotificationConfig> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return DEFAULT_CONFIG;
    }

    // 从用户 metadata 获取配置
    const config = user.user_metadata?.deadlineNotification || DEFAULT_CONFIG;
    
    return {
      ...DEFAULT_CONFIG,
      ...config,
    };
  } catch (error) {
    console.error("Error getting deadline config:", error);
    return DEFAULT_CONFIG;
  }
};

// 保存截止时间通知配置
export const saveDeadlineConfig = async (config: DeadlineNotificationConfig): Promise<boolean> => {
  try {
    const { error } = await supabase.auth.updateUser({
      data: {
        deadlineNotification: config
      }
    });

    if (error) throw error;

    toast({
      title: "设置已保存",
      description: "截止时间通知设置已成功保存",
    });

    return true;
  } catch (error) {
    console.error("Error saving deadline config:", error);
    toast({
      title: "保存失败",
      description: "无法保存截止时间通知设置",
      variant: "destructive",
    });
    return false;
  }
};

// 检查任务是否即将截止
export const checkUpcomingDeadlines = (
  tasks: Task[], 
  reminderMinutes: number
): Task[] => {
  const now = new Date();
  const checkTime = new Date(now.getTime() + reminderMinutes * 60 * 1000);

  return tasks.filter(task => {
    // 只检查未完成、未删除、未放弃的任务
    if (task.completed || task.deleted || task.abandoned || !task.date) {
      return false;
    }

    const deadline = new Date(task.date);
    
    // 检查是否在提醒时间范围内
    return deadline > now && deadline <= checkTime;
  });
};

// 发送浏览器通知
export const sendBrowserNotification = async (task: Task) => {
  const deadline = task.date ? new Date(task.date) : null;
  const deadlineText = deadline
    ? deadline.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  await ensureNotificationPermission();
  await sendUnifiedNotification({
    title: `任务即将截止`,
    body: `${task.title}${deadlineText ? `\n截止时间: ${deadlineText}` : ''}`,
    tag: `task-${task.id}`,
  });
};

// 请求通知权限
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!("Notification" in window)) {
    throw new Error("浏览器不支持通知功能");
  }

  if (Notification.permission === "default") {
    return await Notification.requestPermission();
  }

  return Notification.permission;
};

// 格式化时间差
export const formatTimeUntilDeadline = (deadline: string): string => {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diffMs = deadlineDate.getTime() - now.getTime();
  
  if (diffMs <= 0) {
    return "已截止";
  }
  
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 0) {
    return `${diffDays}天后`;
  } else if (diffHours > 0) {
    return `${diffHours}小时后`;
  } else {
    return `${diffMinutes}分钟后`;
  }
};

// 批量检查并发送通知
export const checkAndNotify = async (tasks: Task[]): Promise<void> => {
  try {
    const config = await getDeadlineConfig();
    
    if (!config.enabled) {
      return;
    }

    const upcomingTasks = checkUpcomingDeadlines(tasks, config.reminderMinutes);
    
    if (upcomingTasks.length === 0) {
      return;
    }

    // 发送浏览器通知
    if (config.browserNotificationEnabled) {
      for (const task of upcomingTasks) {
        sendBrowserNotification(task);
      }
    }

    // 显示应用内通知
    if (upcomingTasks.length === 1) {
      const task = upcomingTasks[0];
      const timeLeft = formatTimeUntilDeadline(task.date!);
      
      toast({
        title: "任务即将截止",
        description: `${task.title} (${timeLeft})`,
        duration: 5000,
      });
    } else {
      toast({
        title: "多个任务即将截止",
        description: `有 ${upcomingTasks.length} 个任务即将截止`,
        duration: 5000,
      });
    }

    // TODO: 如果启用了 Webhook，这里可以调用云函数发送通知
    if (config.webhookEnabled) {
      console.log("Webhook notifications would be sent for:", upcomingTasks);
      // 未来可以通过 Supabase Functions 实现 Webhook 通知
    }

  } catch (error) {
    console.error("Error in deadline notification:", error);
  }
};