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

  const CheckInDayContent = useCallback(({ date }: DayContentProps) => {
    const checked = checkedDateKeys.has(toLocalDateKey(date));
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-1 leading-none">
        <span className="text-sm font-medium">{date.getDate()}</span>
        {checked ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-foreground/70" aria-label="已打卡" />
        ) : (
          <span className="h-3.5" aria-hidden="true" />
        )}
      </div>
    );
  }, [checkedDateKeys]);

  const stats = [
    {
      label: "最近一次打卡",
      value: lastCheckIn ? format(lastCheckIn, "yyyy年MM月dd日 HH:mm", { locale: zhCN }) : "无",
      icon: "clock" as const,
    },
    {
      label: "累计打卡",
      value: `${totalCount} 次`,
      icon: "increase" as const,
    },
    {
      label: "当前连续",
      value: `${streak} 天`,
      icon: "fire" as const,
    },
    {
      label: "打卡提醒",
      value: "坚持就是胜利，明天继续加油！",
      icon: "light" as const,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader className="space-y-2">
          <DialogTitle className="flex items-center">
            <Icon icon="calendar-thirty" className="mr-2 text-gray-700 dark:text-gray-300" />
            打卡记录
            {streak > 0 && (
              <Badge variant="secondary" className="ml-2 font-medium">
                连续打卡 {streak} 天
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>查看您的打卡历史记录</DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-5">
          {loading ? (
            <div className="grid gap-4">
              <Skeleton className="h-[410px] w-full rounded-xl" />
              <div className="grid gap-3 sm:grid-cols-2">
                <Skeleton className="h-24 rounded-xl" />
                <Skeleton className="h-24 rounded-xl" />
                <Skeleton className="h-24 rounded-xl" />
                <Skeleton className="h-24 rounded-xl" />
              </div>
            </div>
          ) : (
            <>
              <div className="relative w-full">
                <Calendar
                  mode="single"
                  selected={undefined}
                  onSelect={() => undefined}
                  locale={zhCN}
                  month={visibleMonth}
                  onMonthChange={setVisibleMonth}
                  showOutsideDays={false}
                  className="w-full rounded-xl border p-4 [--cell-size:2.5rem]"
                  classNames={{
                    months: "w-full",
                    month: "w-full space-y-4",
                    table: "w-full border-collapse",
                    head_row: "grid grid-cols-7",
                    head_cell: "w-full text-center text-xs font-normal text-muted-foreground",
                    row: "mt-2 grid grid-cols-7",
                    cell: "relative h-14 w-full p-0 text-center text-sm focus-within:z-20",
                    day: "h-14 w-full rounded-md p-0 font-normal hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                    day_today: "font-semibold text-foreground",
                  }}
                  components={{ DayContent: CheckInDayContent }}
                />
                {monthLoading && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/60 backdrop-blur-[1px]">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>

              <div className="grid gap-3 text-sm sm:grid-cols-2">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-xl border bg-card p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-xs tracking-wide text-muted-foreground">{stat.label}</div>
                        <div className="mt-2 text-base font-semibold leading-snug text-foreground">
                          {stat.value}
                        </div>
                      </div>
                      <Icon icon={stat.icon} className="h-6 w-6 shrink-0 text-muted-foreground/70" />
                    </div>
                  </div>
                ))}
              </div>

              {totalCount === 0 && (
                <div className="rounded-lg border p-4 text-center text-sm text-muted-foreground">
                  还没有任何打卡记录
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CheckInHistory;
