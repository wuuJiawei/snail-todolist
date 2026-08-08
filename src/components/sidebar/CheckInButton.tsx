import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon-park";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import * as storageOps from "@/data/operations";
import CheckInHistory from "@/components/checkin/CheckInHistory";
import { useAuth } from "@/contexts/AuthContext";

const IS_CHECK_IN_FEATURE_ENABLED = true;

interface CheckInButtonProps {
  onClick?: () => void;
  className?: string;
}

const CheckInButton: React.FC<CheckInButtonProps> = ({
  onClick,
  className,
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isAnimating, setIsAnimating] = useState(false);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkStatus = useCallback(async () => {
    if (!user) {
      setCheckedInToday(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const checked = await storageOps.hasCheckedInToday();
      setCheckedInToday(checked);
    } catch (error) {
      console.error("Error checking check-in status:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void checkStatus();

    let midnightTimer: number | undefined;
    const scheduleMidnightRefresh = () => {
      const now = new Date();
      const nextMidnight = new Date(now);
      nextMidnight.setHours(24, 0, 1, 0);
      midnightTimer = window.setTimeout(async () => {
        await checkStatus();
        scheduleMidnightRefresh();
      }, Math.max(1000, nextMidnight.getTime() - now.getTime()));
    };
    scheduleMidnightRefresh();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void checkStatus();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (midnightTimer !== undefined) window.clearTimeout(midnightTimer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [checkStatus]);

  const handleClick = async () => {
    await checkStatus();

    if (checkedInToday) {
      toast({
        title: "已经打过卡了",
        description: "今天已经打过卡了，明天再来吧！",
        variant: "default",
      });
      return;
    }

    setIsAnimating(true);

    const result = await storageOps.createCheckIn();

    if (result) {
      toast({
        title: "打卡成功",
        description: "今天又是充满活力的一天！",
        variant: "default",
      });
      setCheckedInToday(true);
      await checkStatus();

      setTimeout(() => {
        setIsAnimating(false);
      }, 3000);

      if (onClick) onClick();
    } else {
      setIsAnimating(false);
      toast({
        title: "打卡失败",
        description: "请稍后再试",
        variant: "destructive",
      });
      await checkStatus();
    }
  };

  const handleHistoryClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setHistoryOpen(true);
  };

  if (!IS_CHECK_IN_FEATURE_ENABLED) {
    return null;
  }

  return (
    <div className={cn("flex flex-col items-center mt-auto mb-4", className)}>
      <div className="relative h-8 w-full flex justify-center mb-1 overflow-hidden">
        <div
          className={cn(
            "animate-snail-crawl transition-all duration-300",
            (isAnimating || checkedInToday) && "scale-125"
          )}
        >
          <Icon
            icon="snail"
            size={24}
            className={cn(
              "text-gray-600 dark:text-gray-400 transition-colors duration-300",
              (isAnimating || checkedInToday) && "text-gray-900 dark:text-gray-100"
            )}
          />
        </div>
      </div>

      <div className="flex w-full gap-2">
        <Button
          onClick={handleClick}
          variant="outline"
          disabled={loading || checkedInToday}
          className={cn(
            "flex-1 transition-all duration-300",
            (isAnimating || checkedInToday)
              ? "bg-gray-200 hover:bg-gray-300 text-gray-900 border-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-100 dark:border-gray-700"
              : "bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200 dark:bg-gray-900 dark:hover:bg-gray-800 dark:text-gray-300 dark:border-gray-800"
          )}
        >
          {loading ? "加载中..." : (checkedInToday || isAnimating) ? "已打卡" : "打卡"}
        </Button>

        <Button
          onClick={handleHistoryClick}
          variant="outline"
          size="icon"
          className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
        >
          <Icon icon="calendar-thirty" size={18} />
        </Button>
      </div>

      <CheckInHistory
        open={historyOpen}
        onOpenChange={setHistoryOpen}
      />
    </div>
  );
};

export default CheckInButton;
