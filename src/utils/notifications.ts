import { Task } from "@/types/task";

// Browser notification functions
const requestBrowserPermission = async (): Promise<NotificationPermission> => {
  if (!("Notification" in window)) {
    return "denied";
  }

  if (Notification.permission === "granted") {
    return "granted";
  }

  if (Notification.permission === "denied") {
    return "denied";
  }

  const permission = await Notification.requestPermission();
  return permission;
};

const sendBrowserNotification = async (title: string, body: string, tag?: string) => {
  if (Notification.permission === "granted") {
    new Notification(title, {
      body,
      tag,
      icon: "/logo.png",
    });
  }
};

// 确保通知权限已获取
export const ensureNotificationPermission = async (): Promise<boolean> => {
  const permission = await requestBrowserPermission();
  return permission === "granted";
};

// Unified notification API - currently only browser notifications
export const sendNotification = async (options: { title: string, body: string, tag?: string }) => {
  const { title, body, tag } = options;
  await sendBrowserNotification(title, body, tag);
};

export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  return await requestBrowserPermission();
};

// Task-specific notification helpers
export const sendTaskReminder = async (task: Task) => {
  const title = "任务提醒";
  const body = `任务 "${task.title}" 即将到期`;
  await sendNotification({ title, body, tag: `task-${task.id}` });
};

export const sendTaskOverdue = async (task: Task) => {
  const title = "任务已逾期";
  const body = `任务 "${task.title}" 已超过截止日期`;
  await sendNotification({ title, body, tag: `task-${task.id}` });
};


