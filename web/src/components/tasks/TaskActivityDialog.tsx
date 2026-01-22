import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { taskActivityQueries } from "@/queries/taskActivityQueries";
import type { TaskActivity } from "@/types/taskActivity";
import { format, formatDistanceToNow, parseISO, isValid } from "date-fns";
import { zhCN } from "date-fns/locale";

interface TaskActivityDialogProps {
  taskId: string;
  taskTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatDateLabel = (iso: string | null | undefined) => {
  if (!iso) return "未设置";
  const parsed = parseISO(iso);
  if (!isValid(parsed)) return iso;
  return format(parsed, "yyyy年M月d日", { locale: zhCN });
};

const formatTimestamp = (iso: string) => {
  const parsed = parseISO(iso);
  if (!isValid(parsed)) return iso;
  const relative = formatDistanceToNow(parsed, { addSuffix: true, locale: zhCN });
  const absolute = format(parsed, "yyyy-MM-dd HH:mm", { locale: zhCN });
  return { relative, absolute };
};

const describeActivity = (activity: TaskActivity): string => {
  const metadata = (activity.metadata || {}) as Record<string, any>;

  switch (activity.action) {
    case "task_created":
      return "创建了任务";
    case "title_updated":
      return `标题从「${metadata.from ?? "未命名"}」修改为「${metadata.to ?? "未命名"}」`;
    case "description_updated":
      return "更新了任务详情";
    case "status_updated": {
      const from = metadata.from === "completed" ? "已完成" : "待处理";
      const to = metadata.to === "completed" ? "已完成" : "待处理";
      return `状态从「${from}」变更为「${to}」`;
    }
    case "due_date_updated":
      return `截止日期从「${formatDateLabel(metadata.from ?? null)}」变更为「${formatDateLabel(metadata.to ?? null)}」`;
    case "project_changed":
      return "更新了所属项目";
    case "attachments_updated":
      return `更新了附件（${metadata.previousCount ?? 0} → ${metadata.nextCount ?? 0}）`;
    case "tag_added":
      return `添加标签 #${metadata.tagName ?? metadata.tagId ?? ""}`;
    case "tag_removed":
      return `移除标签 #${metadata.tagName ?? metadata.tagId ?? ""}`;
    case "task_moved_to_trash":
      return "将任务移入垃圾桶";
    case "task_restored":
      return "从垃圾桶恢复任务";
    case "task_abandoned":
      return "将任务标记为已放弃";
    case "task_reactivated":
      return "重新激活了任务";
    default:
      return "更新了任务";
  }
};

const ActivityItem: React.FC<{ activity: TaskActivity; isLast: boolean }> = ({ activity, isLast }) => {
  const { relative, absolute } = formatTimestamp(activity.created_at);
  const description = describeActivity(activity);

  return (
    <div className="relative pl-6">
      <span className="absolute left-0 top-2 h-2 w-2 rounded-full bg-primary" />
      {!isLast && <span className="absolute left-[3px] top-4 h-full w-px bg-border" />}
      <p className="text-sm text-foreground">{description}</p>
      <p className="text-xs text-muted-foreground mt-1">
        {relative}（{absolute}）
      </p>
      <Separator className="my-3" />
    </div>
  );
};

const TaskActivityDialog: React.FC<TaskActivityDialogProps> = ({ taskId, taskTitle, open, onOpenChange }) => {
  const queryOptions = taskActivityQueries.byTask(taskId);
  const { data, isLoading, isError } = useQuery({
    ...queryOptions,
    enabled: open && Boolean(taskId),
  });

  const content = () => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div className="space-y-2" key={`activity-skeleton-${index}`}>
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          ))}
        </div>
      );
    }

    if (isError) {
      return <p className="text-sm text-destructive">无法加载任务动态，请稍后再试。</p>;
    }

    if (!data || data.length === 0) {
      return <p className="text-sm text-muted-foreground">暂时没有记录，开始编辑任务以生成动态。</p>;
    }

    return (
      <div className="space-y-1">
        {data.map((activity, index) => (
          <ActivityItem key={activity.id} activity={activity} isLast={index === data.length - 1} />
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>任务动态 · {taskTitle || "未命名任务"}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="mt-4 max-h-[60vh] pr-4">
          {content()}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default TaskActivityDialog;
