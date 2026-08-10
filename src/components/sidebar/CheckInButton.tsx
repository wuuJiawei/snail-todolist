import React, { useCallback, useEffect, useState } from "react";
import { addDays, endOfWeek, startOfWeek } from "date-fns";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon-park";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import * as storageOps from "@/data/operations";
import { getCheckInsByRange } from "@/services/checkInHistoryService";
import CheckInHistory from "@/components/checkin/CheckInHistory";
import { useAuth } from "@/contexts/AuthContext";

const IS_CHECK_IN_FEATURE_ENABLED = true;
const WEEK_LABELS = ["一", "二", "三", "四", "五", "六", "日"];

interface CheckInButtonProps {
  onClick?: () => void;
  className?: string;
}

const toLocalDateKey = (value: Date) =>
  `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;

const getCurrentWeek = (now = new Date()) => {
  const start = startOfWeek(now, { weekStartsOn: 1 });
  const end = endOfWeek(now, { weekStartsOn: 1 });
  return {
    start,
    end,
    days: Array.from({ length: 7 }, (_, index) => addDays(start, index)),
  };
};

const CheckInButton: React.FC<CheckInButtonProps> = ({
  onClick,
  className,
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [weekCheckInDates, setWeekCheckInDates] = useState<Set<string>>(new Set());
  const [streak, setStreak] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const refreshCheckInSummary = useCallback(async () => {
    if (!user) {
      setCheckedInToday(false);
      setWeekCheckInDates(new Set());
      setStreak(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const now = new Date();
      const { start, end } = getCurrentWeek(now);
      const [weekRecords, currentStreak] = await Promise.all([
        getCheckInsByRange(start.toISOString(), end.toISOString()),
        storageOps.getCheckInStreak(),
      ]);
      const checkedDates = new Set(
        weekRecords.map((record) => toLocalDateKey(new Date(record.checkInTime))),
      );
      setWeekCheckInDates(checkedDates);
      setCheckedInToday(checkedDates.has(toLocalDateKey(now)));
      setStreak(currentStreak);
    } catch (error) {
      console.error("Error loading check-in summary:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refreshCheckInSummary();

    let midnightTimer: number | undefined;
    const scheduleMidnightRefresh = () => {
      const now = new Date();
      const nextMidnight = new Date(now);
      nextMidnight.setHours(24, 0, 1, 0);
      midnightTimer = window.setTimeout(async () => {
        await refreshCheckInSummary();
        scheduleMidnightRefresh();
      }, Math.max(1000, nextMidnight.getTime() - now.getTime()));
    };
    scheduleMidnightRefresh();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void refreshCheckInSummary();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (midnightTimer !== undefined) window.clearTimeout(midnightTimer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshCheckInSummary]);

  const handleClick = async () => {
    if (checkedInToday) {
      toast({
        title: "已经签到",
        description: "今天已经签到，明天再来吧！",
        variant: "default",
      });
      return;
    }

    setSubmitting(true);
    try {
      const result = await storageOps.createCheckIn();
      if (!result) {
        toast({
          title: "签到失败",
          description: "请稍后再试",
          variant: "destructive",
        });
        await refreshCheckInSummary();
        return;
      }

      toast({
        title: "签到成功",
        description: "今天又是充满活力的一天！",
        variant: "default",
      });
      await refreshCheckInSummary();
      onClick?.();
    } finally {
      setSubmitting(false);
    }
  };

  const handleHistoryClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    setHistoryOpen(true);
  };

  if (!IS_CHECK_IN_FEATURE_ENABLED) {
    return null;
  }

  const { days: weekDays } = getCurrentWeek();
  const todayKey = toLocalDateKey(new Date());

  return (
    <div className={cn("mt-auto mb-4 w-full rounded-xl border bg-card p-3 shadow-sm", className)}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-foreground">每日签到</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            {loading ? "正在读取签到状态" : `连续签到 ${streak} 天`}
          </div>
        </div>
        <Button
          onClick={handleHistoryClick}
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
          title="查看签到记录"
        >
          <Icon icon="calendar-thirty" size={16} />
        </Button>
      </div>

      <div className="mb-3 grid grid-cols-7 gap-1">
        {weekDays.map((day, index) => {
          const dateKey = toLocalDateKey(day);
          const checked = weekCheckInDates.has(dateKey);
          const isToday = dateKey === todayKey;
          return (
            <div key={dateKey} className="flex min-w-0 flex-col items-center gap-1">
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full border text-xs transition-colors",
                  checked
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground",
                  isToday && !checked && "border-primary/50 text-foreground",
                )}
                aria-label={`${dateKey}${checked ? " 已签到" : " 未签到"}`}
              >
                {checked ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : null}
              </div>
              <span
                className={cn(
                  "text-[10px] leading-none text-muted-foreground",
                  isToday && "font-medium text-foreground",
                )}
              >
                {WEEK_LABELS[index]}
              </span>
            </div>
          );
        })}
      </div>

      <Button
        onClick={handleClick}
        disabled={loading || submitting || checkedInToday}
        variant={checkedInToday ? "secondary" : "default"}
        className="h-8 w-full text-xs font-medium"
      >
        {loading ? "加载中..." : submitting ? "签到中..." : checkedInToday ? "今日已签到" : "立即签到"}
      </Button>

      <CheckInHistory
        open={historyOpen}
        onOpenChange={setHistoryOpen}
      />
    </div>
  );
};

export default CheckInButton;
