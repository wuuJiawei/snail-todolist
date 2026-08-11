import React, { ReactNode, useMemo } from "react";
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
import { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useProjectContext } from "@/contexts/ProjectContext";
import { cn } from "@/lib/utils";
import { Task } from "@/types/task";

interface ArchiveTaskPageProps {
  title: string;
  description: string;
  heroImage: string;
  tasks: Task[];
  getTimestamp: (task: Task) => string | undefined;
  timestampLabel: string;
  emptyIcon: LucideIcon;
  emptyTitle: string;
  emptyDescription: string;
  actions?: ReactNode;
  emptyAction?: ReactNode;
  loading?: boolean;
  loadingLabel?: string;
  recordCountText?: string;
  showExpiredDeadline?: boolean;
  onSelectTask?: (task: Task) => void;
  renderTaskAction?: (task: Task) => ReactNode;
}

interface TaskGroup {
  date: string;
  tasks: Task[];
}

const UNKNOWN_DATE = "unknown";

const ArchiveTaskPage: React.FC<ArchiveTaskPageProps> = ({
  title,
  description,
  heroImage,
  tasks,
  getTimestamp,
  timestampLabel,
  emptyIcon: EmptyIcon,
  emptyTitle,
  emptyDescription,
  actions,
  emptyAction,
  loading = false,
  loadingLabel = "正在加载...",
  recordCountText,
  showExpiredDeadline = false,
  onSelectTask,
  renderTaskAction,
}) => {
  const { projects } = useProjectContext();

  const projectNameMap = useMemo(
    () => new Map(projects.map((project) => [project.id, project.name])),
    [projects],
  );

  const groupedTasks = useMemo<TaskGroup[]>(() => {
    const grouped = new Map<string, Task[]>();

    tasks.forEach((task) => {
      const timestamp = getTimestamp(task);
      const date = timestamp ? parseISO(timestamp) : null;
      const dateKey = date && isValid(date) ? format(date, "yyyy-MM-dd") : UNKNOWN_DATE;
      grouped.set(dateKey, [...(grouped.get(dateKey) ?? []), task]);
    });

    return Array.from(grouped.entries())
      .map(([date, groupedItems]) => ({
        date,
        tasks: [...groupedItems].sort((a, b) => {
          const aTimestamp = getTimestamp(a);
          const bTimestamp = getTimestamp(b);
          return (bTimestamp ? Date.parse(bTimestamp) : 0) - (aTimestamp ? Date.parse(aTimestamp) : 0);
        }),
      }))
      .sort((a, b) => {
        if (a.date === UNKNOWN_DATE) return 1;
        if (b.date === UNKNOWN_DATE) return -1;
        return b.date.localeCompare(a.date);
      });
  }, [getTimestamp, tasks]);

  if (loading && tasks.length === 0) {
    return (
      <div className="flex h-full min-h-0 flex-1 items-center justify-center text-muted-foreground">
        {loadingLabel}
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 overflow-y-auto overscroll-contain bg-background scrollbar-hidden">
      <section className="relative overflow-hidden border-b bg-background">
        <img
          src={heroImage}
          alt=""
          aria-hidden="true"
          loading="eager"
          decoding="sync"
          fetchPriority="high"
          className="pointer-events-none absolute inset-0 h-full w-full max-w-none object-cover object-right"
        />

        <div className="relative flex min-h-[230px] flex-col justify-between px-8 py-7 lg:px-10">
          <div className="max-w-xl">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
            <p className="mt-5 text-sm leading-6 text-muted-foreground">{description}</p>
            <p className="mt-6 text-sm font-medium text-muted-foreground">
              {recordCountText ?? `共 ${tasks.length} 条记录`}
            </p>
          </div>

          {actions && <div className="flex flex-wrap items-center gap-2 self-end">{actions}</div>}
        </div>
      </section>

      {tasks.length === 0 ? (
        <div className="flex min-h-[360px] flex-col items-center justify-center px-6 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <EmptyIcon className="h-5 w-5 text-muted-foreground" />
          </div>
          <h2 className="text-base font-medium text-foreground">{emptyTitle}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{emptyDescription}</p>
          {emptyAction && <div className="mt-4">{emptyAction}</div>}
        </div>
      ) : (
        <div className="px-8 py-5 lg:px-10">
          <div className="relative max-w-5xl">
            {groupedTasks.map(({ date, tasks: groupTasks }, groupIndex) => (
              <section key={date} className="relative pb-3 last:pb-1">
                <div
                  className={cn(
                    "absolute bottom-0 left-[5px] top-[18px] w-px bg-border",
                    groupIndex === groupedTasks.length - 1 && "bottom-4",
                  )}
                  aria-hidden="true"
                />

                <div className="relative flex items-center gap-3">
                  <span className="relative z-10 h-[11px] w-[11px] shrink-0 rounded-full border-2 border-background bg-foreground shadow-[0_0_0_1px_hsl(var(--border))]" />
                  <h2 className="text-sm font-medium leading-5 text-muted-foreground">
                    {formatDateHeader(date, timestampLabel)}
                  </h2>
                </div>

                <div className="ml-6 mt-1 space-y-0">
                  {groupTasks.map((task) => (
                    <ArchiveTaskRow
                      key={task.id}
                      task={task}
                      projectName={task.project ? projectNameMap.get(task.project) : undefined}
                      timestamp={getTimestamp(task)}
                      timestampLabel={timestampLabel}
                      showExpiredDeadline={showExpiredDeadline}
                      action={renderTaskAction?.(task)}
                      onSelect={onSelectTask ? () => onSelectTask(task) : undefined}
                    />
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

interface ArchiveTaskRowProps {
  task: Task;
  projectName?: string;
  timestamp?: string;
  timestampLabel: string;
  showExpiredDeadline: boolean;
  action?: ReactNode;
  onSelect?: () => void;
}

const ArchiveTaskRow: React.FC<ArchiveTaskRowProps> = ({
  task,
  projectName,
  timestamp,
  timestampLabel,
  showExpiredDeadline,
  action,
  onSelect,
}) => {
  const deadlineText = useMemo(() => formatDeadline(task.date), [task.date]);
  const deadlineExpired = useMemo(() => {
    if (!showExpiredDeadline || !task.date) return false;
    const date = parseISO(task.date);
    return isValid(date) && isBefore(startOfDay(date), startOfDay(new Date()));
  }, [showExpiredDeadline, task.date]);

  return (
    <div
      className={cn(
        "group flex min-h-[42px] items-center gap-3 rounded-md px-2 py-1.5 transition-colors",
        onSelect && "cursor-pointer hover:bg-muted/50",
      )}
      onClick={onSelect}
    >
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="max-w-full truncate text-sm font-medium leading-5 text-foreground">{task.title}</span>
          {projectName && (
            <Badge variant="secondary" className="h-5 rounded-full px-2 text-[11px] font-normal text-muted-foreground">
              {projectName}
            </Badge>
          )}
        </div>

        {deadlineText && (
          <p className={cn("mt-0.5 text-xs leading-4", deadlineExpired ? "text-destructive" : "text-muted-foreground")}>
            截止：{deadlineText}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2" onClick={(event) => event.stopPropagation()}>
        <span className="hidden text-xs leading-5 text-muted-foreground sm:inline">
          {formatTimestamp(timestamp, timestampLabel)}
        </span>
        {action}
      </div>
    </div>
  );
};

const formatDateHeader = (dateStr: string, timestampLabel: string) => {
  if (dateStr === UNKNOWN_DATE) return `${timestampLabel}时间未知`;
  const date = parseISO(dateStr);
  return isValid(date) ? format(date, "yyyy年MM月dd日", { locale: zhCN }) : dateStr;
};

const formatTimestamp = (timestamp: string | undefined, label: string) => {
  if (!timestamp) return `${label}时间未知`;
  const date = parseISO(timestamp);
  if (!isValid(date)) return `${label}时间未知`;
  const dateText = isToday(date)
    ? `今天 ${format(date, "HH:mm")}`
    : format(date, "MM月dd日 HH:mm", { locale: zhCN });
  return `${dateText} ${label}`;
};

const formatDeadline = (dateStr: string | undefined) => {
  if (!dateStr) return null;
  const date = parseISO(dateStr);
  if (!isValid(date)) return null;
  if (isToday(date)) return "今天";
  if (isTomorrow(date)) return "明天";
  return format(date, "MM月dd日", { locale: zhCN });
};

export default ArchiveTaskPage;
