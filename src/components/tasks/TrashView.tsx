import React, { useEffect, useMemo, useState } from "react";
import { format, isBefore, isToday, isTomorrow, isValid, parseISO, startOfDay } from "date-fns";
import { zhCN } from "date-fns/locale";
import { ArchiveRestore, Loader2, RotateCcw, Trash2 } from "lucide-react";
import { useTaskContext } from "@/contexts/task";
import { useProjectContext } from "@/contexts/ProjectContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Task } from "@/types/task";

const TRASH_HERO_URL = "/images/trash-hero.webp?v=20260811-2";

const TrashView: React.FC = () => {
  const {
    trashedTasks,
    restoreFromTrash,
    deleteTask,
    selectTask,
    trashedLoading,
    loadTrashedTasks,
    trashedLoaded,
  } = useTaskContext();
  const { projects } = useProjectContext();
  const { toast } = useToast();
  const [batchAction, setBatchAction] = useState<"restore" | "clear" | null>(null);
  const [restoringTaskId, setRestoringTaskId] = useState<string | null>(null);

  useEffect(() => {
    void loadTrashedTasks();
  }, [loadTrashedTasks]);

  const groupedTasks = useMemo(() => {
    const grouped = new Map<string, Task[]>();

    trashedTasks.forEach((task) => {
      const dateKey = task.deleted_at?.split("T")[0] ?? "unknown";
      const tasks = grouped.get(dateKey) ?? [];
      tasks.push(task);
      grouped.set(dateKey, tasks);
    });

    return Array.from(grouped.entries())
      .map(([date, tasks]) => ({
        date,
        tasks: [...tasks].sort((a, b) => {
          const aTime = a.deleted_at ? new Date(a.deleted_at).getTime() : 0;
          const bTime = b.deleted_at ? new Date(b.deleted_at).getTime() : 0;
          return bTime - aTime;
        }),
      }))
      .sort((a, b) => {
        if (a.date === "unknown") return 1;
        if (b.date === "unknown") return -1;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
  }, [trashedTasks]);

  const projectNameMap = useMemo(
    () => new Map(projects.map((project) => [project.id, project.name])),
    [projects],
  );

  const formatDateHeader = (dateStr: string) => {
    if (dateStr === "unknown") return "删除时间未知";
    const date = parseISO(dateStr);
    return isValid(date) ? format(date, "yyyy年MM月dd日", { locale: zhCN }) : dateStr;
  };

  const handleRestoreTask = async (id: string) => {
    if (restoringTaskId || batchAction) return;
    setRestoringTaskId(id);
    try {
      await restoreFromTrash(id);
    } catch (error) {
      console.error("Failed to restore task:", error);
      toast({
        title: "恢复失败",
        description: "任务恢复失败，请稍后重试。",
        variant: "destructive",
      });
    } finally {
      setRestoringTaskId(null);
    }
  };

  const handleRestoreAll = async () => {
    if (batchAction || trashedTasks.length === 0) return;
    setBatchAction("restore");
    try {
      // 串行执行，避免并发更新同一份任务缓存时互相覆盖。
      for (const task of [...trashedTasks]) {
        await restoreFromTrash(task.id);
      }
      toast({
        title: "恢复完成",
        description: `已恢复 ${trashedTasks.length} 条任务。`,
      });
    } catch (error) {
      console.error("Failed to restore all tasks:", error);
      toast({
        title: "批量恢复失败",
        description: "部分任务可能已经恢复，请刷新后重试。",
        variant: "destructive",
      });
    } finally {
      setBatchAction(null);
    }
  };

  const handleClearTrash = async () => {
    if (batchAction || trashedTasks.length === 0) return;
    setBatchAction("clear");
    try {
      // deleteTask 会同步更新 Provider 缓存，因此这里同样采用串行删除。
      for (const task of [...trashedTasks]) {
        await deleteTask(task.id);
      }
      toast({
        title: "垃圾桶已清空",
        description: "垃圾桶中的任务已永久删除。",
      });
    } catch (error) {
      console.error("Failed to clear trash:", error);
      toast({
        title: "清空失败",
        description: "部分任务可能已经删除，请刷新后重试。",
        variant: "destructive",
      });
    } finally {
      setBatchAction(null);
    }
  };

  const isBusy = batchAction !== null;

  if (trashedLoading && !trashedLoaded && trashedTasks.length === 0) {
    return (
      <div className="flex h-full min-h-0 flex-1 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        正在加载垃圾桶...
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 overflow-y-auto overscroll-contain bg-background scrollbar-hidden">
      <section className="relative isolate overflow-hidden border-b bg-background">
        <div
          className="pointer-events-none absolute inset-0 z-0 bg-no-repeat"
          style={{
            backgroundImage: `url(${TRASH_HERO_URL})`,
            backgroundPosition: "right center",
            backgroundSize: "cover",
          }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-background via-background/50 to-background/5 dark:via-background/80 dark:to-background/35"
          aria-hidden="true"
        />

        <div className="relative z-10 flex min-h-[230px] flex-col justify-between px-8 py-7 lg:px-10">
          <div className="max-w-xl">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">垃圾桶</h1>
            <p className="mt-5 text-sm leading-6 text-muted-foreground">
              删除的任务会在垃圾桶中保留 30 天，之后将被自动清除。
            </p>
            <p className="mt-6 text-sm font-medium text-muted-foreground">
              共 {trashedTasks.length} 条记录
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-end">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isBusy || trashedTasks.length === 0}
                  className="bg-background/85 backdrop-blur-sm"
                >
                  {batchAction === "clear" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  清空垃圾桶
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>确认清空垃圾桶？</AlertDialogTitle>
                  <AlertDialogDescription>
                    将永久删除垃圾桶中的 {trashedTasks.length} 条任务，此操作无法撤销。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearTrash}>确认清空</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={isBusy || trashedTasks.length === 0}
                  className="bg-secondary/90 backdrop-blur-sm"
                >
                  {batchAction === "restore" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ArchiveRestore className="mr-2 h-4 w-4" />
                  )}
                  批量恢复
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>恢复全部任务？</AlertDialogTitle>
                  <AlertDialogDescription>
                    将把垃圾桶中的 {trashedTasks.length} 条任务恢复到原清单。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRestoreAll}>全部恢复</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </section>

      {trashedTasks.length === 0 ? (
        <div className="flex min-h-[360px] flex-col items-center justify-center px-6 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Trash2 className="h-5 w-5 text-muted-foreground" />
          </div>
          <h2 className="text-base font-medium text-foreground">垃圾桶为空</h2>
          <p className="mt-1 text-sm text-muted-foreground">删除的任务会显示在这里，并保留 30 天。</p>
        </div>
      ) : (
        <div className="px-8 py-5 lg:px-10">
          <div className="relative max-w-5xl">
            {groupedTasks.map(({ date, tasks }, groupIndex) => (
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
                  <h2 className="text-sm font-medium leading-5 text-muted-foreground">{formatDateHeader(date)}</h2>
                </div>

                <div className="ml-6 mt-1 space-y-0">
                  {tasks.map((task) => (
                    <TrashTaskRow
                      key={task.id}
                      task={task}
                      projectName={task.project ? projectNameMap.get(task.project) : undefined}
                      isRestoring={restoringTaskId === task.id}
                      disabled={isBusy || restoringTaskId !== null}
                      onRestore={() => handleRestoreTask(task.id)}
                      onSelect={() => selectTask(task.id)}
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

interface TrashTaskRowProps {
  task: Task;
  projectName?: string;
  isRestoring: boolean;
  disabled: boolean;
  onRestore: () => void;
  onSelect: () => void;
}

const TrashTaskRow: React.FC<TrashTaskRowProps> = ({
  task,
  projectName,
  isRestoring,
  disabled,
  onRestore,
  onSelect,
}) => {
  const deadlineText = useMemo(() => {
    if (!task.date) return null;
    const date = parseISO(task.date);
    if (!isValid(date)) return null;

    if (isToday(date)) return "今天";
    if (isTomorrow(date)) return "明天";
    return format(date, "MM月dd日", { locale: zhCN });
  }, [task.date]);

  const deadlineExpired = useMemo(() => {
    if (!task.date) return false;
    const date = parseISO(task.date);
    if (!isValid(date)) return false;
    return isBefore(startOfDay(date), startOfDay(new Date()));
  }, [task.date]);

  const deletedText = useMemo(() => {
    if (!task.deleted_at) return "删除时间未知";
    const date = parseISO(task.deleted_at);
    if (!isValid(date)) return "删除时间未知";
    return isToday(date)
      ? `今天 ${format(date, "HH:mm")}`
      : format(date, "MM月dd日 HH:mm", { locale: zhCN });
  }, [task.deleted_at]);

  return (
    <div
      className="group flex min-h-[42px] cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-muted/50"
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
          <p
            className={cn(
              "mt-0.5 text-xs leading-4",
              deadlineExpired ? "text-destructive" : "text-muted-foreground",
            )}
          >
            截止：{deadlineText}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2" onClick={(event) => event.stopPropagation()}>
        <span className="hidden text-xs leading-5 text-muted-foreground sm:inline">{deletedText} 删除</span>
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled}
          onClick={onRestore}
          className="h-7 w-7 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          title="恢复任务"
        >
          {isRestoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
};

export default TrashView;
