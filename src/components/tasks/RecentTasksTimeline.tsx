import React, { ReactNode, useMemo, useRef, useState } from "react";
import {
  format,
  isBefore,
  isToday,
  isTomorrow,
  isValid,
  parseISO,
  startOfDay,
} from "date-fns";
import { zhCN } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Task } from "@/types/task";
import { getRecentAgendaDates } from "@/utils/recentTasks";

interface RecentTasksTimelineProps {
  tasks: Task[];
  renderTask: (task: Task) => ReactNode;
  emptyMessage?: string;
}

interface TimelineGroup {
  key: string;
  date?: Date;
  tasks: Task[];
  overdue?: boolean;
}

const OVERDUE_KEY = "overdue";

const RecentTasksTimeline: React.FC<RecentTasksTimelineProps> = ({
  tasks,
  renderTask,
  emptyMessage = "最近 7 天没有任务",
}) => {
  const dates = useMemo(() => getRecentAgendaDates(), []);
  const [selectedDateKey, setSelectedDateKey] = useState(() => format(dates[0], "yyyy-MM-dd"));
  const dateStripRef = useRef<HTMLDivElement>(null);
  const groupRefs = useRef(new Map<string, HTMLElement>());

  const groups = useMemo<TimelineGroup[]>(() => {
    const today = startOfDay(dates[0]);
    const grouped = new Map<string, Task[]>();

    tasks.forEach((task) => {
      if (!task.date) return;
      const taskDate = parseISO(task.date);
      if (!isValid(taskDate)) return;

      const key = isBefore(taskDate, today) ? OVERDUE_KEY : format(taskDate, "yyyy-MM-dd");
      grouped.set(key, [...(grouped.get(key) ?? []), task]);
    });

    const sortTasks = (items: Task[]) => [...items].sort((a, b) =>
      Date.parse(a.date ?? "") - Date.parse(b.date ?? ""),
    );
    const result: TimelineGroup[] = [];
    const overdueTasks = grouped.get(OVERDUE_KEY);

    if (overdueTasks?.length) {
      result.push({ key: OVERDUE_KEY, tasks: sortTasks(overdueTasks), overdue: true });
    }

    dates.forEach((date) => {
      const key = format(date, "yyyy-MM-dd");
      const dateTasks = grouped.get(key);
      if (dateTasks?.length) result.push({ key, date, tasks: sortTasks(dateTasks) });
    });

    return result;
  }, [dates, tasks]);

  const scrollDateStrip = (direction: -1 | 1) => {
    dateStripRef.current?.scrollBy({ left: direction * 240, behavior: "smooth" });
  };

  const selectDate = (date: Date) => {
    const key = format(date, "yyyy-MM-dd");
    setSelectedDateKey(key);
    groupRefs.current.get(key)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div>
      <div className="sticky top-0 z-20 border-y border-border/50 bg-background/95 px-3 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/85 lg:px-6">
        <div className="mx-auto flex max-w-5xl items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 rounded-full text-muted-foreground"
            onClick={() => scrollDateStrip(-1)}
            aria-label="向前滚动日期"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div
            ref={dateStripRef}
            className="flex min-w-0 flex-1 snap-x snap-mandatory gap-1 overflow-x-auto overscroll-x-contain scrollbar-hidden"
          >
            {dates.map((date) => {
              const key = format(date, "yyyy-MM-dd");
              const selected = key === selectedDateKey;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => selectDate(date)}
                  aria-current={selected ? "date" : undefined}
                  className={cn(
                    "flex min-w-[68px] snap-center flex-col items-center rounded-xl px-3 py-2 text-center transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    selected
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <span className="text-xs font-medium">
                    {isToday(date) ? "今天" : format(date, "EEE", { locale: zhCN })}
                  </span>
                  <span className={cn("mt-1 text-sm", selected ? "font-semibold" : "font-medium")}>{format(date, "M/d")}</span>
                </button>
              );
            })}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 rounded-full text-muted-foreground"
            onClick={() => scrollDateStrip(1)}
            aria-label="向后滚动日期"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : (
        <div className="px-6 py-5 lg:px-10">
          <div className="relative mx-auto max-w-5xl">
            {groups.map((group, groupIndex) => (
              <section
                key={group.key}
                ref={(element) => {
                  if (element) groupRefs.current.set(group.key, element);
                  else groupRefs.current.delete(group.key);
                }}
                className="relative scroll-mt-28 pb-4 last:pb-1"
              >
                <div
                  className={cn(
                    "absolute bottom-0 left-[5px] top-[18px] w-px bg-border",
                    groupIndex === groups.length - 1 && "bottom-5",
                  )}
                  aria-hidden="true"
                />

                <div className="relative flex items-center gap-3">
                  <span
                    className={cn(
                      "relative z-10 h-[11px] w-[11px] shrink-0 rounded-full border-2 border-background shadow-[0_0_0_1px_hsl(var(--border))]",
                      group.overdue ? "bg-destructive" : "bg-foreground",
                    )}
                  />
                  <h2 className="flex items-center gap-2 text-sm font-medium leading-5 text-muted-foreground">
                    <span>{formatGroupTitle(group)}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-normal tabular-nums">
                      {group.tasks.length}
                    </span>
                  </h2>
                </div>

                <div className="ml-6 mt-1 divide-y divide-border/40">
                  {group.tasks.map((task) => (
                    <div key={task.id}>{renderTask(task)}</div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const formatGroupTitle = (group: TimelineGroup) => {
  if (group.overdue || !group.date) return "逾期";
  if (isToday(group.date)) return `今天 · ${format(group.date, "M月d日 EEE", { locale: zhCN })}`;
  if (isTomorrow(group.date)) return `明天 · ${format(group.date, "M月d日 EEE", { locale: zhCN })}`;
  return format(group.date, "M月d日 EEEE", { locale: zhCN });
};

export default RecentTasksTimeline;
