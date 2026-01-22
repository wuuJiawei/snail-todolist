import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import * as storageOps from "@/storage/operations";
import { CheckInRecord } from "@/storage/types";
import { Icon } from "@/components/ui/icon-park";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";

interface CheckInHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CheckInHistory: React.FC<CheckInHistoryProps> = ({
  open,
  onOpenChange
}) => {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<CheckInRecord[]>([]);
  const [streak, setStreak] = useState(0);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [lastCheckIn, setLastCheckIn] = useState<Date | null>(null);
  const pageSize = 365; // Load up to one year of history for calendar view

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const { records, total } = await storageOps.getCheckInHistory(1, pageSize);
      setRecords(records);
      setTotalCount(total);

      // Get streak
      const currentStreak = await storageOps.getCheckInStreak();
      setStreak(currentStreak);

      const dates = Array.from(
        new Set(records.map(record => {
          const date = new Date(record.check_in_time);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        }))
      ).map(dateStr => {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
      });
      setSelectedDates(dates);
      if (records.length > 0) {
        setLastCheckIn(new Date(records[0].check_in_time));
      } else {
        setLastCheckIn(null);
      }
    } catch (error) {
      console.error("Error fetching check-in history:", error);
    } finally {
      setLoading(false);
    }
  }, [pageSize]);

  useEffect(() => {
    if (open) {
      fetchHistory();
    }
  }, [open, fetchHistory]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
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
          <DialogDescription>
            查看您的打卡历史记录
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="grid gap-2">
              <Skeleton className="h-80 w-full rounded-md" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-border/60 bg-background shadow-inner p-4">
                <Calendar
                  mode="multiple"
                  selected={selectedDates}
                  onSelect={() => {}}
                  showOutsideDays={false}
                  className="rounded-md [--cell-size:2.4rem]"
                  modifiers={{ checkin: selectedDates }}
                  modifiersStyles={{
                    checkin: {
                      backgroundColor: "var(--primary)",
                      color: "var(--primary-foreground)",
                    },
                  }}
                />
              </div>

              <div className="grid gap-3 text-sm text-gray-600 dark:text-gray-300 sm:grid-cols-2">
                {[
                  {
                    label: "最近一次打卡",
                    value: lastCheckIn ? format(lastCheckIn, "yyyy年MM月dd日 HH:mm", { locale: zhCN }) : "无",
                    icon: "clock" as const,
                    gradient: "from-primary/15 via-primary/5 to-transparent"
                  },
                  {
                    label: "累计打卡",
                    value: `${totalCount} 次`,
                    icon: "increase" as const,
                    gradient: "from-blue-200/30 via-blue-100/20 to-transparent dark:from-blue-500/10 dark:via-blue-400/10 dark:to-transparent"
                  },
                  {
                    label: "当前连续",
                    value: `${streak} 天`,
                    icon: "fire" as const,
                    gradient: "from-amber-200/30 via-amber-100/20 to-transparent dark:from-amber-500/10 dark:via-amber-400/10 dark:to-transparent"
                  },
                  {
                    label: "打卡提醒",
                    value: "坚持就是胜利，明天继续加油！",
                    icon: "light" as const,
                    gradient: "from-muted/60 via-muted/40 to-transparent dark:from-muted/30 dark:via-muted/20 dark:to-transparent"
                  }
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className={`rounded-xl border border-border/60 bg-gradient-to-br ${stat.gradient} p-4`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">{stat.label}</div>
                        <div className="mt-2 text-base font-semibold text-foreground leading-tight">
                          {stat.value}
                        </div>
                      </div>
                      <Icon icon={stat.icon} className="h-7 w-7 text-muted-foreground/70" />
                    </div>
                  </div>
                ))}
              </div>

              {records.length === 0 ? (
                <div className="rounded-md border p-4 text-center text-sm text-gray-500">
                  还没有任何打卡记录
                </div>
              ) : null}
            </div>
          )}
        </div>

      </DialogContent>
    </Dialog>
  );
};

export default CheckInHistory;
