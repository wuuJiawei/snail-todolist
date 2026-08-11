import React, { useState } from "react";
import { CircleX, Loader2, RotateCcw } from "lucide-react";
import ArchiveTaskPage from "@/components/tasks/ArchiveTaskPage";
import { ArchiveTaskFilterActions } from "@/components/tasks/ArchiveTaskFilters";
import { useArchiveTaskFilters } from "@/components/tasks/useArchiveTaskFilters";
import { Button } from "@/components/ui/button";
import { useProjectContext } from "@/contexts/ProjectContext";
import { useTaskContext } from "@/contexts/task";
import { useToast } from "@/hooks/use-toast";
import { Task } from "@/types/task";

interface AbandonedTasksViewProps {
  tasks: Task[];
}

const ABANDONED_HERO_URL = "/images/abandoned-hero.webp";
const ABANDONED_TASKS_FILTERS_KEY = "abandonedTasksFilters";
const getAbandonedTimestamp = (task: Task) => task.abandoned_at;

const AbandonedTasksView: React.FC<AbandonedTasksViewProps> = ({ tasks }) => {
  const { projects } = useProjectContext();
  const {
    selectTask,
    restoreAbandonedTask,
    abandonedLoading,
    abandonedLoaded,
  } = useTaskContext();
  const { toast } = useToast();
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
    getTimestamp: getAbandonedTimestamp,
    storageKey: ABANDONED_TASKS_FILTERS_KEY,
  });

  const handleRestoreTask = async (task: Task) => {
    if (restoringTaskId) return;
    setRestoringTaskId(task.id);
    try {
      await restoreAbandonedTask(task.id);
      toast({ title: "任务已恢复", description: `「${task.title}」已恢复到原清单。` });
    } catch (error) {
      console.error("Failed to restore abandoned task:", error);
      toast({
        title: "恢复失败",
        description: "任务恢复失败，请稍后重试。",
        variant: "destructive",
      });
    } finally {
      setRestoringTaskId(null);
    }
  };

  const emptyTitle = filterActive ? "未找到匹配的已放弃任务" : "还没有已放弃任务";
  const emptyDescription = filterActive
    ? "调整或清除筛选条件后再试。"
    : "放弃的任务会按操作日期显示在这里。";

  return (
    <ArchiveTaskPage
      title="已放弃"
      description="暂时放下的任务会保留在这里，需要时可以随时恢复。"
      heroImage={ABANDONED_HERO_URL}
      tasks={filteredTasks}
      getTimestamp={getAbandonedTimestamp}
      timestampLabel="放弃"
      emptyIcon={CircleX}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
      emptyAction={filterActive ? (
        <Button variant="outline" size="sm" onClick={clearFilters}>清除筛选</Button>
      ) : undefined}
      loading={abandonedLoading && !abandonedLoaded}
      loadingLabel="正在加载已放弃任务..."
      recordCountText={filterActive
        ? `筛选出 ${filteredTasks.length} / ${tasks.length} 条记录`
        : `共 ${tasks.length} 条记录`}
      showExpiredDeadline
      onSelectTask={(task) => selectTask(task.id)}
      renderTaskAction={(task) => (
        <Button
          variant="ghost"
          size="icon"
          disabled={restoringTaskId !== null}
          onClick={() => handleRestoreTask(task)}
          className="h-7 w-7 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          title="恢复任务"
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
          storageKey={ABANDONED_TASKS_FILTERS_KEY}
          dateRange={dateRange}
          selectedProjects={selectedProjects}
          onDateRangeChange={updateDateRange}
          onSelectedProjectsChange={setSelectedProjects}
          onClear={clearFilters}
        />
      }
    />
  );
};

export default AbandonedTasksView;
