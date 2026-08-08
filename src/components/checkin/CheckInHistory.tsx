import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { zhCN } from "date-fns/locale";
import type { DayContentProps } from "react-day-picker";
import { CheckCircle2, Loader2 } from "lucide-react";
import * as storageOps from "@/data/operations";
import type { CheckInRecord } from "@/data/operations";
import type { CheckInRecord as DomainCheckInRecord } from "@/data/contracts/checkInRepository";
import { getCheckInsByRange } from "@/services/checkInHistoryService";
import { Icon } from "@/components/ui/icon-park";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";

interface CheckInHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const toLocalDateKey = (value: Date) =>
  `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;

const toMonthKey = (value: Date) => `${value.getFullYear()}-${value.getMonth() + 1}`;

const CheckInHistory: React.FC<CheckInHistoryProps> = ({
  open,
  onOpenChange,
}) => {
  const [loading, setLoading] = useState(true);
  const [monthLoading, setMonthLoading] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  const [monthRecords, setMonthRecords] = useState<DomainCheckInRecord[]>([]);
  const [streak, setStreak] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [lastCheckIn, setLastCheckIn] = useState<Date | null>(null);
  const monthCacheRef = useRef(new Map<string, DomainCheckInRecord[]>());

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const [{ records, total }, currentStreak] = await Promise.all([
        storageOps.getCheckInHistory(1, 1),
        storageOps.getCheckInStreak(),
      ]);
      const latest: CheckInRecord | undefined = records[0];
      setTotalCount(total);
      setStreak(currentStreak);
      setLastCheckIn(latest ? new Date(latest.check_in_time) : null);
    } catch (error) {
      console.error("Error fetching check-in overview:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMonth = useCallback(async (month: Date) => {
    const monthKey = toMonthKey(month);
    const cached = monthCacheRef.current.get(monthKey);
    if (cached) {
      setMonthRecords(cached);
      return;
    }

    setMonthLoading(true);
    try {
      const records = await getCheckInsByRange(
        startOfMonth(month).toISOString(),
        endOfMonth(month).toISOString(),
      );
      monthCacheRef.current.set(monthKey, records);
      setMonthRecords(records);
    } catch (error) {
      console.error("Error fetching monthly check-in history:", error);
      setMonthRecords([]);
    } finally {
      setMonthLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void fetchOverview();
  }, [open, fetchOverview]);

  useEffect(() => {
    if (open) void fetchMonth(visibleMonth);
  }, [open, visibleMonth, fetchMonth]);

  useEffect(() => {
    if (!open) {
      monthCacheRef.current.clear();
      setVisibleMonth(new Date());
      setMonthRecords([]);
    }
  }, [open]);

  const checkedDateKeys = useMemo(
    () => new Set(monthRecords.map((record) => toLocalDateKey(new Date(record.checkInTime)))),
    [monthRecords],
  );

  const checkedDates = useMemo(
    () => Array.from(checkedDateKeys).map((dateKey) => {
      const [year, month, day] = dateKey.split("-").map(Number);
      return new Date(year, month - 1, day);
    }),
    [checkedDateKeys],
  );

  const CheckInDayContent = useCallback(({ date }: DayContentProps) => {
    const checked = checkedDateKeys.has(toLocalDateKey(date));
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-0.5 leading-none">
        <span className="text-sm font-medium">{date.getDate()}</span>
        {checked ? (
          <span className="flex items-center gap-0.5 text-[10px] font-medium text-primary">
            <CheckCircle2 className="h-2.5 w-2.5" />
            已打卡
          </span>
        ) : (
          <span className="h-2.5 text-[10px] opacity-0" aria-hidden="true">已打卡</span>
        )}
      </div>
    );
  }, [checkedDateKeys]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Icon icon="calendar-thirty" className="mr-2 text-gray-700 dark:text-gray-300" />
            打卡记录
            {streak > 0 && (
              <Badge variant="outline" className="ml-2 bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                连续打卡 {streak} 天
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>查看您的打卡历史记录</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="grid gap-3">
              <Skeleton className="mx-auto h-[390px] w-full max-w-[500px] rounded-lg" />
              <div className="grid gap-3 sm:grid-cols-2">
                <Skeleton className="h-24 rounded-xl" />
                <Skeleton className="h-24 rounded-xl" />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative mx-auto w-fit">
                <Calendar
                  mode="single"
                  selected={undefined}
                  onSelect={() => undefined}
                  locale={zhCN}
                  month={visibleMonth}
                  onMonthChange={setVisibleMonth}
                  showOutsideDays={false}
                  className="rounded-lg border [--cell-size:3.25rem] sm:[--cell-size:3.5rem]"
                  components={{ DayContent: CheckInDayContent }}
                  modifiers={{ checkedIn: checkedDates }}
                  modifiersClassNames={{
                    checkedIn: "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary",
                  }}
                />
                {monthLoading && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/60 backdrop-blur-[1px]">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>

              <div className="grid gap-3 text-sm text-gray-600 dark:text-gray-300 sm:grid-cols-2">
                {[
                  {
                    label: "最近一次打卡",
                    value: lastCheckIn ? format(lastCheckIn, "yyyy年MM月dd日 HH:mm", { locale: zhCN }) : "无",
                    icon: "clock" as const,
                    gradient: "from-primary/15 via-primary/5 to-transparent",
                  },
                  {
                    label: "累计打卡",
                    value: `${totalCount} 次`,
                    icon: "increase" as const,
                    gradient: "from-blue-200/30 via-blue-100/20 to-transparent dark:from-blue-500/10 dark:via-blue-400/10 dark:to-transparent",
                  },
                  {
                    label: "当前连续",
                    value: `${streak} 天`,
                    icon: "fire" as const,
                    gradient: "from-amber-200/30 via-amber-100/20 to-transparent dark:from-amber-500/10 dark:via-amber-400/10 dark:to-transparent",
                  },
                  {
                    label: "打卡提醒",
                    value: "坚持就是胜利，明天继续加油！",
                    icon: "light" as const,
                    gradient: "from-muted/60 via-muted/40 to-transparent dark:from-muted/30 dark:via-muted/20 dark:to-transparent",
                  },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className={`rounded-xl border border-border/60 bg-gradient-to-br ${stat.gradient} p-4`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">{stat.label}</div>
                        <div className="mt-2 text-base font-semibold leading-tight text-foreground">
                          {stat.value}
                        </div>
                      </div>
                      <Icon icon={stat.icon} className="h-7 w-7 text-muted-foreground/70" />
                    </div>
                  </div>
                ))}
              </div>

              {totalCount === 0 && (
                <div className="rounded-md border p-4 text-center text-sm text-gray-500">
                  还没有任何打卡记录
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CheckInHistory;
