import { useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import * as storageOps from "@/data/operations";
import { taskKeys } from "@/queries/taskQueries";
import type { Task } from "@/types/task";

const SORT_ORDER_STEP = 1000;

type PendingReorder = {
  projectId: string;
  movedId: string;
  prevId?: string;
  nextId?: string;
  isCompletedArea: boolean;
};

const extractSortOrder = (task: Task): number | undefined => {
  if (typeof task.sort_order === "number" && !Number.isNaN(task.sort_order)) return task.sort_order;
  if (task.sort_order === undefined) return undefined;
  const parsed = Number(task.sort_order);
  return Number.isNaN(parsed) ? undefined : parsed;
};

export const calculateTaskSortOrder = (tasks: Task[], destinationIndex: number): number => {
  const existingOrders = tasks.map(extractSortOrder).filter((value): value is number => value !== undefined);
  const baseOrder = existingOrders.length > 0 ? Math.min(...existingOrders) - SORT_ORDER_STEP : 0;
  const previous = tasks[destinationIndex - 1];
  const next = tasks[destinationIndex + 1];
  const previousOrder = previous
    ? extractSortOrder(previous) ?? baseOrder + (tasks.indexOf(previous) + 1) * SORT_ORDER_STEP
    : undefined;
  const nextOrder = next
    ? extractSortOrder(next) ?? baseOrder + (tasks.indexOf(next) + 1) * SORT_ORDER_STEP
    : undefined;

  if (previousOrder != null && nextOrder != null) return (previousOrder + nextOrder) / 2;
  if (previousOrder != null) return previousOrder + SORT_ORDER_STEP;
  if (nextOrder != null) return nextOrder - SORT_ORDER_STEP;
  return baseOrder + SORT_ORDER_STEP;
};

export const useTaskReorder = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const savingRef = useRef(false);
  const pendingRef = useRef<PendingReorder | null>(null);

  const getTasks = useCallback(
    () => queryClient.getQueryData<Task[]>(taskKeys.active()) ?? [],
    [queryClient],
  );
  const setTasks = useCallback(
    (tasks: Task[]) => queryClient.setQueryData(taskKeys.active(), tasks),
    [queryClient],
  );

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!savingRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  const persistQueuedReorders = useCallback(async () => {
    while (pendingRef.current) {
      const job = pendingRef.current;
      pendingRef.current = null;
      const projectTasks = getTasks().filter(
        (task) => task.project === job.projectId && Boolean(task.completed) === job.isCompletedArea,
      );
      const previousIndex = job.prevId ? projectTasks.findIndex((task) => task.id === job.prevId) : -1;
      const destinationIndex = previousIndex >= 0
        ? previousIndex + 1
        : Math.max(0, projectTasks.findIndex((task) => task.id === job.nextId));
      const newOrder = calculateTaskSortOrder(projectTasks, destinationIndex);

      try {
        savingRef.current = true;
        const saved = await storageOps.updateTask(job.movedId, { sort_order: newOrder });
        if (!saved) throw new Error("queued reorder failed");
        toast({ title: "已保存排序" });
      } catch (error) {
        console.error("Failed to process queued task order:", error);
        toast({
          title: "排序保存失败",
          description: "存在未保存的排序变更未能同步到服务器",
          variant: "destructive",
        });
      } finally {
        savingRef.current = false;
      }
    }
  }, [getTasks, toast]);

  return useCallback(async (
    projectId: string,
    sourceIndex: number,
    destinationIndex: number,
    isCompletedArea = false,
  ) => {
    if (sourceIndex === destinationIndex) return;

    const currentTasks = getTasks();
    const projectTasks = currentTasks.filter(
      (task) => task.project === projectId && Boolean(task.completed) === isCompletedArea,
    );
    const reordered = [...projectTasks];
    const [moved] = reordered.splice(sourceIndex, 1);
    if (!moved) return;
    reordered.splice(destinationIndex, 0, moved);

    const previous = reordered[destinationIndex - 1];
    const next = reordered[destinationIndex + 1];
    const newOrder = calculateTaskSortOrder(reordered, destinationIndex);
    const movedWithOrder = { ...moved, sort_order: newOrder };
    const belongsToArea = (task: Task) =>
      task.project === projectId && Boolean(task.completed) === isCompletedArea;
    const nextTasks = [
      ...reordered.map((task) => task.id === moved.id ? movedWithOrder : task),
      ...currentTasks.filter((task) => !belongsToArea(task)),
    ];
    setTasks(nextTasks);

    if (savingRef.current) {
      pendingRef.current = {
        projectId,
        movedId: moved.id,
        prevId: previous?.id,
        nextId: next?.id,
        isCompletedArea,
      };
      return;
    }

    try {
      savingRef.current = true;
      const saved = await storageOps.updateTask(moved.id, { sort_order: newOrder });
      if (!saved) throw new Error("reorder task failed");
      toast({ title: "已保存排序" });
    } catch (error) {
      setTasks(currentTasks);
      console.error("Failed to update task order in database:", error);
      toast({
        title: "排序保存失败",
        description: "任务顺序已回滚，请稍后重试",
        variant: "destructive",
      });
    } finally {
      savingRef.current = false;
      await persistQueuedReorders();
    }
  }, [getTasks, setTasks, toast, persistQueuedReorders]);
};
