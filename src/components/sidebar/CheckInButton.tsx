import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon-park";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { createCheckIn, hasCheckedInToday } from "@/services/checkInService";
import CheckInHistory from "@/components/checkin/CheckInHistory";
import { useAuth } from "@/contexts/AuthContext";

// Add this configuration flag at the top of the file
const IS_CHECK_IN_FEATURE_ENABLED = true; // Feature flag for check-in

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

  // Function to check status that can be called from other functions
  const checkStatus = useCallback(async () => {
    if (user) {
      setLoading(true);
      try {
        const checked = await hasCheckedInToday();
        setCheckedInToday(checked);
      } catch (error) {
        console.error("Error checking check-in status:", error);
      } finally {
        setLoading(false);
      }
    }
  }, [user]);

  // Check status on component mount and when user changes
  useEffect(() => {
    // Initial check
    checkStatus();

    // Set up an interval to check status every minute
    const intervalId = setInterval(checkStatus, 60000);

    // Clean up the interval when component unmounts
    return () => clearInterval(intervalId);
  }, [user, checkStatus]);

  const handleClick = async () => {
    // Double-check current status before proceeding
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

    // Create check-in record in Supabase
    const success = await createCheckIn();

    if (success) {
      // Immediately update state
      setCheckedInToday(true);

      // Also refresh the status from server to be sure
      await checkStatus();

      // Reset animation after 3 seconds
      setTimeout(() => {
        setIsAnimating(false);
      }, 3000);

      // Call the provided onClick handler if it exists
      if (onClick) onClick();
    } else {
      setIsAnimating(false);
      // Refresh status in case of failure too
      await checkStatus();
    }
  };

  const handleHistoryClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setHistoryOpen(true);
  };

  // If the feature is not enabled, render nothing
  if (!IS_CHECK_IN_FEATURE_ENABLED) {
    return null;
  }

  return (
    <div className={cn("flex flex-col items-center mt-auto mb-4", className)}>
      {/* Animated snail */}
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

      {/* Check-in button and history button */}
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

      {/* Check-in history dialog */}
      <CheckInHistory
        open={historyOpen}
        onOpenChange={setHistoryOpen}
      />
    </div>
  );
};

export default CheckInButton;
