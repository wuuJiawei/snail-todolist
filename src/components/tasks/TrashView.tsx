import React, { useState } from "react";
import { ArchiveRestore, Loader2, RotateCcw, Trash2 } from "lucide-react";
import ArchiveTaskPage from "@/components/tasks/ArchiveTaskPage";
import { Button } from "@/components/ui/button";
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
import { useTaskContext } from "@/contexts/task";
import { useToast } from "@/hooks/use-toast";

const TRASH_HERO_URL = "/images/trash-hero.webp";

const TrashView: React.FC = () => {
  const {
    trashedTasks,
    restoreFromTrash,
    deleteTask,
    selectTask,
    trashedLoading,
    trashedLoaded,
  } = useTaskContext();
  const { toast } = useToast();
  const [batchAction, setBatchAction] = useState<"restore" | "clear" | null>(null);
  const [restoringTaskId, setRestoringTaskId] = useState<string | null>(null);

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
      for (const task of [...trashedTasks]) {
        await restoreFromTrash(task.id);
      }
      toast({ title: "恢复完成", description: `已恢复 ${trashedTasks.length} 条任务。` });
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
      for (const task of [...trashedTasks]) {
        await deleteTask(task.id);
      }
      toast({ title: "垃圾桶已清空", description: "垃圾桶中的任务已永久删除。" });
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

  return (
    <ArchiveTaskPage
      title="垃圾桶"
      description="删除的任务会在垃圾桶中保留 30 天，之后将被自动清除。"
      heroImage={TRASH_HERO_URL}
      tasks={trashedTasks}
      getTimestamp={(task) => task.deleted_at}
      timestampLabel="删除"
      emptyIcon={Trash2}
      emptyTitle="垃圾桶为空"
      emptyDescription="删除的任务会显示在这里，并保留 30 天。"
      loading={trashedLoading && !trashedLoaded}
      loadingLabel="正在加载垃圾桶..."
      showExpiredDeadline
      onSelectTask={(task) => selectTask(task.id)}
      renderTaskAction={(task) => (
        <Button
          variant="ghost"
          size="icon"
          disabled={isBusy || restoringTaskId !== null}
          onClick={() => handleRestoreTask(task.id)}
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
        <>
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
        </>
      }
    />
  );
};

export default TrashView;
