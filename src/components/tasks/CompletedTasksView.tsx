import React, { useMemo, useState } from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { CheckCircle2, Copy, FileDown, Loader2, RotateCcw } from "lucide-react";
import ArchiveTaskPage from "@/components/tasks/ArchiveTaskPage";
import { ArchiveTaskFilterActions } from "@/components/tasks/ArchiveTaskFilters";
import { useArchiveTaskFilters } from "@/components/tasks/useArchiveTaskFilters";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { COMPLETED_TASKS_FILTERS_KEY } from "@/constants/storage-keys";
import { useProjectContext } from "@/contexts/ProjectContext";
import { useTaskContext } from "@/contexts/task";
import { useToast } from "@/hooks/use-toast";
import { Task } from "@/types/task";

interface CompletedTasksViewProps {
  tasks: Task[];
  loading?: boolean;
  exportDialogOpen?: boolean;
  onExportDialogChange?: (open: boolean) => void;
}

const COMPLETED_HERO_URL = "/images/completed-hero.webp";
const getCompletedTimestamp = (task: Task) => task.completed_at;

const CompletedTasksView: React.FC<CompletedTasksViewProps> = ({
  tasks,
  loading = false,
  exportDialogOpen: externalExportDialogOpen,
  onExportDialogChange,
}) => {
  const { projects } = useProjectContext();
  const { selectTask, updateTask } = useTaskContext();
  const { toast } = useToast();
  const [internalExportDialogOpen, setInternalExportDialogOpen] = useState(false);
  const [restoringTaskId, setRestoringTaskId] = useState<string | null>(null);
  const {
    dateRange,
    selectedProjects,
    filteredTasks,
    filterActive,
    setSelectedProjects,
    updateDateRange,
    clearFilters,
  } = useArchiveTaskFilters({
    tasks,
    getTimestamp: getCompletedTimestamp,
    storageKey: COMPLETED_TASKS_FILTERS_KEY,
  });

  const exportDialogOpen = externalExportDialogOpen ?? internalExportDialogOpen;
  const setExportDialogOpen = (open: boolean) => {
    if (onExportDialogChange) onExportDialogChange(open);
    else setInternalExportDialogOpen(open);
  };

  const handleRestoreTask = async (task: Task) => {
    if (restoringTaskId) return;
    setRestoringTaskId(task.id);
    try {
      await updateTask(task.id, { completed: false });
      toast({ title: "已取消完成", description: `「${task.title}」已恢复为未完成。` });
    } catch (error) {
      console.error("Failed to restore completed task:", error);
      toast({
        title: "恢复失败",
        description: "无法取消任务的完成状态，请稍后重试。",
        variant: "destructive",
      });
    } finally {
      setRestoringTaskId(null);
    }
  };

  const markdownContent = useMemo(
    () => buildCompletedTasksMarkdown(filteredTasks, projects, dateRange, selectedProjects),
    [dateRange, filteredTasks, projects, selectedProjects],
  );

  const emptyTitle = filterActive ? "未找到匹配的已完成任务" : "还没有已完成任务";
  const emptyDescription = filterActive
    ? "调整或清除筛选条件后再试。"
    : "完成的任务会按完成日期显示在这里。";

  return (
    <>
      <ArchiveTaskPage
        title="已完成"
        description="所有已完成的任务都记录在这里，随时回顾你的进展。"
        heroImage={COMPLETED_HERO_URL}
        tasks={filteredTasks}
        getTimestamp={getCompletedTimestamp}
        timestampLabel="完成"
        emptyIcon={CheckCircle2}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
        loading={loading}
        loadingLabel="正在加载已完成任务"
        skeletonActionCount={2}
        emptyAction={filterActive ? (
          <Button variant="outline" size="sm" onClick={clearFilters}>清除筛选</Button>
        ) : undefined}
        recordCountText={filterActive
          ? `筛选出 ${filteredTasks.length} / ${tasks.length} 条记录`
          : `共 ${tasks.length} 条记录`}
        onSelectTask={(task) => selectTask(task.id)}
        renderTaskAction={(task) => (
          <Button
            variant="ghost"
            size="icon"
            disabled={restoringTaskId !== null}
            onClick={() => handleRestoreTask(task)}
            className="h-7 w-7 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            title="取消完成"
          >
            {restoringTaskId === task.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
          </Button>
        )}
        actions={
          <ArchiveTaskFilterActions
            projects={projects}
            storageKey={COMPLETED_TASKS_FILTERS_KEY}
            dateRange={dateRange}
            selectedProjects={selectedProjects}
            onDateRangeChange={updateDateRange}
            onSelectedProjectsChange={setSelectedProjects}
            onClear={clearFilters}
            extraActions={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setExportDialogOpen(true)}
                className="bg-secondary/90 backdrop-blur-sm"
              >
                <FileDown className="mr-2 h-4 w-4" />
                导出 Markdown
              </Button>
            }
          />
        }
      />

      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>导出已完成任务</DialogTitle>
          </DialogHeader>
          <Textarea
            value={markdownContent}
            readOnly
            className="mt-2 h-[400px] whitespace-pre-wrap font-mono text-sm"
            onClick={(event) => event.currentTarget.select()}
          />
          <DialogFooter className="mt-4">
            <Button
              onClick={() => {
                void navigator.clipboard.writeText(markdownContent);
                setExportDialogOpen(false);
              }}
            >
              <Copy className="mr-2 h-4 w-4" />
              复制并关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

const buildCompletedTasksMarkdown = (
  tasks: Task[],
  projects: { id: string; name: string }[],
  dateRange: { from?: Date; to?: Date } | undefined,
  selectedProjects: string[],
) => {
  let title = "已完成任务";
  if (dateRange?.from) {
    title += ` (${format(dateRange.from, "yyyy-MM-dd")}`;
    if (dateRange.to && dateRange.to.getTime() !== dateRange.from.getTime()) {
      title += ` 至 ${format(dateRange.to, "yyyy-MM-dd")}`;
    }
    title += ")";
  }

  if (selectedProjects.length > 0) {
    const projectNames = selectedProjects
      .map((id) => projects.find((project) => project.id === id)?.name)
      .filter(Boolean)
      .join("、");
    if (projectNames) title += ` - ${projectNames}`;
  }

  if (tasks.length === 0) return `# ${title}\n\n没有符合条件的已完成任务。`;

  const groups = new Map<string, Task[]>();
  tasks.forEach((task) => {
    if (!task.completed_at) return;
    const date = format(new Date(task.completed_at), "yyyy-MM-dd");
    groups.set(date, [...(groups.get(date) ?? []), task]);
  });

  const content = Array.from(groups.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, groupedTasks]) => {
      const dateTitle = format(new Date(date), "yyyy年MM月dd日", { locale: zhCN });
      const taskContent = groupedTasks
        .sort((a, b) => Date.parse(b.completed_at || "") - Date.parse(a.completed_at || ""))
        .map((task) => {
          const projectName = projects.find((project) => project.id === task.project)?.name || "无清单";
          const completedAt = task.completed_at
            ? format(new Date(task.completed_at), "yyyy-MM-dd HH:mm")
            : "未知时间";
          const description = task.description
            ? `\n- **描述**：${extractTaskDescription(task.description)}`
            : "";
          return `### ${task.title}\n\n- **完成时间**：${completedAt}\n- **清单**：${projectName}${description}`;
        })
        .join("\n\n");
      return `## ${dateTitle}（${groupedTasks.length} 项）\n\n${taskContent}`;
    })
    .join("\n\n---\n\n");

  return `# ${title}\n\n${content}`;
};

const extractTaskDescription = (description: string) => {
  try {
    const parsed = JSON.parse(description);
    if (Array.isArray(parsed.blocks)) {
      return parsed.blocks
        .map((block: { type?: string; data?: { text?: string } }) =>
          block.type === "paragraph" ? block.data?.text || "" : ""
        )
        .filter(Boolean)
        .join("\n");
    }
    if (Array.isArray(parsed)) {
      return parsed
        .map((block: { content?: { type?: string; text?: string }[] }) =>
          Array.isArray(block.content)
            ? block.content.map((content) => content.type === "text" ? content.text || "" : "").join("")
            : ""
        )
        .filter(Boolean)
        .join("\n");
    }
  } catch {
    return description;
  }
  return description;
};

export default CompletedTasksView;
