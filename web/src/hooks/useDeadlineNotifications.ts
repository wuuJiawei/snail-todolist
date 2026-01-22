import { useEffect, useRef } from "react";
import { Task } from "@/types/task";
import { checkAndNotify, getDeadlineConfig } from "@/services/deadlineService";

interface UseDeadlineNotificationsProps {
  tasks: Task[];
  enabled?: boolean;
}

/**
 * Hook to automatically check for upcoming task deadlines and send notifications
 * 
 * @param tasks - Array of tasks to monitor
 * @param enabled - Whether to enable the notification system (default: true)
 */
export const useDeadlineNotifications = ({ 
  tasks, 
  enabled = true 
}: UseDeadlineNotificationsProps) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastCheckRef = useRef<number>(0);
  
  useEffect(() => {
    if (!enabled || !tasks.length) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const checkDeadlines = async () => {
      try {
        const config = await getDeadlineConfig();
        
        if (!config.enabled) {
          return;
        }

        const now = Date.now();
        
        // 避免频繁检查，每5分钟最多检查一次
        if (now - lastCheckRef.current < 5 * 60 * 1000) {
          return;
        }
        
        lastCheckRef.current = now;
        
        // 检查并发送通知
        await checkAndNotify(tasks);
        
      } catch (error) {
        console.error("Error checking deadlines:", error);
      }
    };

    // 立即检查一次
    checkDeadlines();

    // 设置定时器，每5分钟检查一次
    intervalRef.current = setInterval(checkDeadlines, 5 * 60 * 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [tasks, enabled]);

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);
};