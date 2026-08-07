
import React, { useState, ReactNode, useEffect, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Task } from "@/types/task";
import { useToast } from "@/hooks/use-toast";
import { TaskContext } from "./TaskContext";
import { getProjectTaskCount, getSavedProject } from "./taskUtils";
import { SELECTED_PROJECT_KEY } from "./types";
import { useAuth } from "@/contexts/AuthContext";
import { useDeadlineNotifications } from "@/hooks/useDeadlineNotifications";
import { taskKeys, taskQueries } from "@/queries/taskQueries";
import { tagKeys } from "@/queries/tagQueries";
import { useProjectContext } from "@/contexts/ProjectContext";
import * as storageOps from "@/data/operations";
import { canPerformOperation, requiresAuth, subscribeToTasks } from "@/data/operations";
import { buildTaskActivityDrafts, useTaskActivityRecorder } from "./useTaskActivityRecorder";
import { useTaskReorder } from "./useTaskReorder";
import { useTaskTagActions } from "./useTaskTagActions";

interface TaskProviderProps {
  children: ReactNode;
}

const EMPTY_TASKS: Task[] = [];

export const TaskProvider: React.FC<TaskProviderProps> = ({ children }) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string>(getSavedProject());
  const { projects, loading: projectsLoading } = useProjectContext();
  const builtinScopes = useMemo(() => new Set(["recent","today","flagged","completed","abandoned","trash"]), []);

  const {
    data: tasks = EMPTY_TASKS,
    isPending: isActivePending,
  } = useQuery({
    ...taskQueries.active(),
    enabled: canPerformOperation(user),
  });
  const {
    data: trashedTasks = EMPTY_TASKS,
    isFetching: trashedLoading,
    isFetched: trashedLoaded,
  } = useQuery({ ...taskQueries.trashed(), enabled: false });
  const {
    data: abandonedTasks = EMPTY_TASKS,
    isFetching: abandonedLoading,
    isFetched: abandonedLoaded,
  } = useQuery({ ...taskQueries.abandoned(), enabled: false });
  const loading = canPerformOperation(user) && isActivePending;
  const tagTaskIds = useMemo(
    () => tasks.map((task) => task.id),
    [tasks],
  );

  const setTaskList = useCallback((
    queryKey: readonly unknown[],
    updater: Task[] | ((current: Task[]) => Task[]),
  ) => {
    queryClient.setQueryData<Task[]>(queryKey, (current = []) =>
      typeof updater === "function" ? updater(current) : updater
    );
  }, [queryClient]);
  const setTasks = useCallback(
    (updater: Task[] | ((current: Task[]) => Task[])) => setTaskList(taskKeys.active(), updater),
    [setTaskList],
  );
  const setTrashedTasks = useCallback(
    (updater: Task[] | ((current: Task[]) => Task[])) => setTaskList(taskKeys.trashed(), updater),
    [setTaskList],
  );
  const setAbandonedTasks = useCallback(
    (updater: Task[] | ((current: Task[]) => Task[])) => setTaskList(taskKeys.abandoned(), updater),
    [setTaskList],
  );
  const getCachedTasks = useCallback(
    (queryKey: readonly unknown[]) => queryClient.getQueryData<Task[]>(queryKey) ?? [],
    [queryClient],
  );

  const selectedTask = useMemo(() => {
    if (!selectedTaskId) return null;
    return (
      tasks.find(task => task.id === selectedTaskId) ||
      trashedTasks.find(task => task.id === selectedTaskId) ||
      abandonedTasks.find(task => task.id === selectedTaskId) ||
      null
    );
  }, [selectedTaskId, tasks, trashedTasks, abandonedTasks]);

  useEffect(() => {
    if (!selectedTaskId) return;
    if (!selectedTask) {
      setSelectedTaskId(null);
    }
  }, [selectedTaskId, selectedTask, setSelectedTaskId]);
  useEffect(() => {
    if (!user) return;
    if (projectsLoading) return;
    const isBuiltin = builtinScopes.has(selectedProject);
    const existsInProjects = (projects || []).some(p => p.id === selectedProject);
    if (!isBuiltin && !existsInProjects) {
      localStorage.setItem(SELECTED_PROJECT_KEY, "today");
      setSelectedProject("today");
    }
  }, [user, projectsLoading, projects, selectedProject, builtinScopes]);
  
  // Enable deadline notifications for all tasks
  useDeadlineNotifications({ 
    tasks, 
    enabled: true 
  });

  const recordTaskActivity = useTaskActivityRecorder();
  const tagActions = useTaskTagActions(tasks, tagTaskIds, recordTaskActivity);
  const {
    getTaskTags, attachTagToTask, detachTagFromTask, listAllTags, createTag,
    deleteTagPermanently, updateTagProject, renameTag, refreshAllTags,
    getAllTagUsageCounts, getCachedTags, ensureTagsLoaded, tagsVersion,
  } = tagActions;

  useEffect(() => {
    if (canPerformOperation(user)) return;
    setSelectedTaskId(null);
    queryClient.removeQueries({ queryKey: taskKeys.all });
    queryClient.removeQueries({ queryKey: tagKeys.all });
  }, [user, queryClient]);

  // Add task
  const addTask = useCallback(async (task: Omit<Task, "id">) => {
    if (requiresAuth(user)) {
      toast({
        title: "添加失败",
        description: "您需要登录才能添加任务",
        variant: "destructive"
      });
      return;
    }

    try {
      const taskWithUserId = {
        ...task,
        user_id: user!.id
      };
      const newTask = await storageOps.addTask(taskWithUserId);

      if (!newTask) {
        throw new Error("add task failed");
      }

      setTasks((current) => [newTask, ...current.filter((item) => item.id !== newTask.id)]);

      await recordTaskActivity(newTask.id, "task_created", { title: newTask.title });
      queryClient.invalidateQueries({ queryKey: taskKeys.active() });
    } catch (error) {
      console.error("Failed to add task:", error);
      toast({
        title: "添加失败",
        description: "无法添加任务，请稍后再试",
        variant: "destructive"
      });
      throw error;
    }
  }, [user, toast, setTasks, queryClient, recordTaskActivity]);

  // Update task
  const updateTask = useCallback(async (id: string, updatedTask: Partial<Task>) => {
      if (requiresAuth(user)) {
        toast({
          title: "更新失败",
          description: "您需要登录才能更新任务",
          variant: "destructive"
        });
        return;
      }

    const previousTask = getCachedTasks(taskKeys.active()).find((task) => task.id === id);
    const drafts = buildTaskActivityDrafts(previousTask, updatedTask);

    try {
      const updated = await storageOps.updateTask(id, updatedTask);
      if (!updated) {
        throw new Error("update task failed");
      }
      setTasks((current) =>
        current.map((task) => (task.id === id ? { ...task, ...updated } : task))
        );
      if (drafts.length && previousTask) {
        await Promise.all(
          drafts.map((draft) => recordTaskActivity(id, draft.action, draft.metadata))
        );
      }
      queryClient.invalidateQueries({ queryKey: taskKeys.active() });
    } catch (error) {
      console.error("Failed to update task:", error);
      throw error;
    }
  }, [toast, user, setTasks, getCachedTasks, queryClient, recordTaskActivity]);

  const loadTrashedTasks = useCallback(async () => {
    if (!canPerformOperation(user)) return;
    if (trashedLoaded || trashedLoading) return;

    try {
      await queryClient.fetchQuery(taskQueries.trashed());
    } catch (error) {
      console.error("Failed to load trashed tasks:", error);
      toast({
        title: "读取垃圾桶失败",
        description: "无法获取垃圾桶任务，请稍后再试",
        variant: "destructive",
      });
    }
  }, [user, trashedLoaded, trashedLoading, toast, queryClient]);

  const loadAbandonedTasks = useCallback(async () => {
    if (!canPerformOperation(user)) return;
    if (abandonedLoaded || abandonedLoading) return;

    try {
      await queryClient.fetchQuery(taskQueries.abandoned());
    } catch (error) {
      console.error("Failed to load abandoned tasks:", error);
      toast({
        title: "读取已放弃任务失败",
        description: "无法获取已放弃任务列表，请稍后再试",
        variant: "destructive",
      });
    }
  }, [user, abandonedLoaded, abandonedLoading, toast, queryClient]);

  // Move task to trash (soft delete)
  const moveToTrash = useCallback(async (id: string) => {
    try {
      if (requiresAuth(user)) {
        toast({
          title: "删除失败",
          description: "您需要登录才能删除任务",
          variant: "destructive"
        });
        return;
      }

      const success = await storageOps.moveToTrash(id);

      if (!success) {
        throw new Error("move to trash failed");
      }

      const currentTasks = getCachedTasks(taskKeys.active());
      const currentTrashed = getCachedTasks(taskKeys.trashed());
      const taskToTrash = currentTasks.find(task => task.id === id);

      setTasks(currentTasks.filter((task) => task.id !== id));

        if (taskToTrash) {
          const trashedTask = {
            ...taskToTrash,
            deleted: true,
            deleted_at: new Date().toISOString()
          };
        setTrashedTasks([trashedTask, ...currentTrashed]);
        }

        // Clear selection if the trashed task was selected
      if (selectedTaskId === id) {
        setSelectedTaskId(null);
      }

      await recordTaskActivity(id, "task_moved_to_trash");
      queryClient.invalidateQueries({ queryKey: taskKeys.active() });
      queryClient.invalidateQueries({ queryKey: taskKeys.trashed() });
    } catch (error) {
      console.error("Failed to move task to trash:", error);
      throw error;
    }
  }, [user, toast, selectedTaskId, setTasks, setTrashedTasks, setSelectedTaskId, getCachedTasks, queryClient, recordTaskActivity]);

  // Restore task from trash
  const restoreFromTrash = useCallback(async (id: string) => {
    try {
      if (requiresAuth(user)) {
        toast({
          title: "恢复失败",
          description: "您需要登录才能恢复任务",
          variant: "destructive"
        });
        return;
      }

      const success = await storageOps.restoreFromTrash(id);

      if (!success) {
        throw new Error("restore from trash failed");
      }

        // Find the task before removing it from the trashed tasks list
      const currentTrashed = getCachedTasks(taskKeys.trashed());
      const currentTasks = getCachedTasks(taskKeys.active());
      const taskToRestore = currentTrashed.find(task => task.id === id);

        // Remove from trashed tasks
      setTrashedTasks(currentTrashed.filter((task) => task.id !== id));

        // Add to regular tasks if found
        if (taskToRestore) {
          const restoredTask = {
            ...taskToRestore,
            deleted: false,
            deleted_at: undefined
          };
        setTasks([restoredTask, ...currentTasks]);
      }

      await recordTaskActivity(id, "task_restored");
      queryClient.invalidateQueries({ queryKey: taskKeys.active() });
      queryClient.invalidateQueries({ queryKey: taskKeys.trashed() });
    } catch (error) {
      console.error("Failed to restore task from trash:", error);
      throw error;
    }
  }, [user, toast, setTrashedTasks, setTasks, getCachedTasks, queryClient, recordTaskActivity]);

  // Permanently delete task
  const deleteTask = useCallback(async (id: string) => {
    try {
      if (requiresAuth(user)) {
        toast({
          title: "删除失败",
          description: "您需要登录才能删除任务",
          variant: "destructive"
        });
        return;
      }

      const success = await storageOps.deleteTask(id);

      if (!success) {
        throw new Error("delete task failed");
      }

        // Remove from trashed tasks
      const currentTrashed = getCachedTasks(taskKeys.trashed());
      const currentTasks = getCachedTasks(taskKeys.active());
      setTrashedTasks(currentTrashed.filter((task) => task.id !== id));

        // Also ensure it's removed from regular tasks (just in case)
      setTasks(currentTasks.filter((task) => task.id !== id));

      if (selectedTaskId === id) {
        setSelectedTaskId(null);
      }

      queryClient.invalidateQueries({ queryKey: taskKeys.active() });
      queryClient.invalidateQueries({ queryKey: taskKeys.trashed() });
    } catch (error) {
      console.error("Failed to permanently delete task:", error);
      throw error;
    }
  }, [user, toast, selectedTaskId, setTrashedTasks, setTasks, setSelectedTaskId, getCachedTasks, queryClient]);

  useEffect(() => {
    if (!canPerformOperation(user)) return;
    if (selectedProject === "trash") {
      loadTrashedTasks();
    } else if (selectedProject === "abandoned") {
      loadAbandonedTasks();
    }
  }, [selectedProject, user, loadTrashedTasks, loadAbandonedTasks]);

  // Supabase Realtime: tasks changes（按用户 + 可见清单集合过滤；大量项目时分片；若选中具体清单则优先只订阅该清单）
  const visibleProjectIds = useMemo(() => (projects || []).map(p => p.id), [projects]);
  const narrowedProjectIds = useMemo(() => {
    if (selectedProject && !builtinScopes.has(selectedProject)) {
      // 当前选中为具体清单，则仅订阅该清单
      return visibleProjectIds.includes(selectedProject) ? [selectedProject] : [];
    }
    return visibleProjectIds;
  }, [selectedProject, builtinScopes, visibleProjectIds]);

  useEffect(() => {
    if (!user) return;
    const uid = user.id;
    const invalidate = () => queryClient.invalidateQueries({ queryKey: taskKeys.active() });
    return subscribeToTasks(uid, narrowedProjectIds, invalidate);
  }, [user, queryClient, narrowedProjectIds]);

  const selectTask = useCallback((id: string | null) => {
    setSelectedTaskId(id);
  }, [setSelectedTaskId]);

  const selectProject = useCallback((id: string) => {
    // Save the selected project to localStorage
    localStorage.setItem(SELECTED_PROJECT_KEY, id);
    setSelectedProject(id);
    setSelectedTaskId(null);
  }, [setSelectedProject, setSelectedTaskId]);

  const reorderTasks = useTaskReorder();

  // Calculate project counts that will be used by both contexts
  const calculateProjectCounts = useCallback(() => {
    // Create a map to store task counts by project ID
    const projectCounts: Record<string, number> = {};

    // Count tasks for each project
    tasks.forEach(task => {
      if (task.project && !task.completed) {
        projectCounts[task.project] = (projectCounts[task.project] || 0) + 1;
      }
    });

    return projectCounts;
  }, [tasks]);

  // Update project counts in ProjectContext whenever tasks change
  useEffect(() => {
    // Get project counts for custom projects
    const projectCounts = calculateProjectCounts();

    // Find any custom hook or function that might be subscribing to this data
    const event = new CustomEvent('task-counts-updated', {
      detail: { projectCounts }
    });
    window.dispatchEvent(event);
  }, [tasks, calculateProjectCounts]);

  // Abandon a task
  const abandonTask = useCallback(async (id: string) => {
    try {
      if (requiresAuth(user)) {
        toast({
          title: "放弃失败",
          description: "您需要登录才能放弃任务",
          variant: "destructive"
        });
        return;
      }

      const success = await storageOps.abandonTask(id);
      if (!success) {
        throw new Error("abandon task failed");
      }

        // Find the task before removing it from the tasks list
      const currentTasks = getCachedTasks(taskKeys.active());
      const currentAbandoned = getCachedTasks(taskKeys.abandoned());
      const taskToAbandon = currentTasks.find(task => task.id === id);

        // Remove from regular tasks
      setTasks(currentTasks.filter((task) => task.id !== id));

        // Add to abandoned tasks if found
        if (taskToAbandon) {
          const abandonedTask = {
            ...taskToAbandon,
            abandoned: true,
            abandoned_at: new Date().toISOString(),
            completed: false,
            completed_at: undefined
          };
        setAbandonedTasks([abandonedTask, ...currentAbandoned]);
        }

        // Clear selection if the abandoned task was selected
      if (selectedTaskId === id) {
        setSelectedTaskId(null);
      }

      await recordTaskActivity(id, "task_abandoned");
      queryClient.invalidateQueries({ queryKey: taskKeys.active() });
      queryClient.invalidateQueries({ queryKey: taskKeys.abandoned() });
    } catch (error) {
      console.error("Failed to abandon task:", error);
      throw error;
    }
  }, [user, toast, selectedTaskId, setTasks, setAbandonedTasks, setSelectedTaskId, getCachedTasks, queryClient, recordTaskActivity]);

  // Restore task from abandoned
  const restoreAbandonedTask = useCallback(async (id: string) => {
    try {
      if (requiresAuth(user)) {
        toast({
          title: "恢复失败",
          description: "您需要登录才能恢复任务",
          variant: "destructive"
        });
        return;
      }

      const success = await storageOps.restoreAbandonedTask(id);
      if (!success) {
        throw new Error("restore abandoned task failed");
      }

        // Find the task before removing it from the abandoned tasks list
      const currentAbandoned = getCachedTasks(taskKeys.abandoned());
      const currentTasks = getCachedTasks(taskKeys.active());
      const taskToRestore = currentAbandoned.find(task => task.id === id);

        // Remove from abandoned tasks
      setAbandonedTasks(currentAbandoned.filter((task) => task.id !== id));

        // Add to regular tasks if found
        if (taskToRestore) {
          const restoredTask = {
            ...taskToRestore,
            abandoned: false,
            abandoned_at: undefined
          };
        setTasks([restoredTask, ...currentTasks]);
      }

      await recordTaskActivity(id, "task_reactivated");
      queryClient.invalidateQueries({ queryKey: taskKeys.active() });
      queryClient.invalidateQueries({ queryKey: taskKeys.abandoned() });
    } catch (error) {
      console.error("Failed to restore abandoned task:", error);
      throw error;
    }
  }, [user, toast, setAbandonedTasks, setTasks, getCachedTasks, queryClient, recordTaskActivity]);

  // Get the count of tasks in trash
  const getTrashCount = useCallback(() => {
    return trashedTasks.length;
  }, [trashedTasks.length]);

  // Get the count of abandoned tasks
  const getAbandonedCount = useCallback(() => {
    return abandonedTasks.length;
  }, [abandonedTasks.length]);

  const getProjectTaskCountForProject = useCallback((projectId: string) => {
    return getProjectTaskCount(tasks, projectId);
  }, [tasks]);

  const contextValue = useMemo(() => ({
    tasks,
    trashedTasks,
    abandonedTasks,
    loading,
    trashedLoading,
    abandonedLoading,
    trashedLoaded,
    abandonedLoaded,
    selectedTask,
    selectedProject,
    addTask,
    updateTask,
    moveToTrash,
    restoreFromTrash,
    deleteTask,
    abandonTask,
    restoreAbandonedTask,
    loadTrashedTasks,
    loadAbandonedTasks,
    selectTask,
    selectProject,
    reorderTasks,
    getProjectTaskCount: getProjectTaskCountForProject,
    getTrashCount,
    getAbandonedCount,
    getTaskTags,
    attachTagToTask,
    detachTagFromTask,
    listAllTags,
    createTag,
    deleteTagPermanently,
    updateTagProject,
    renameTag,
    refreshAllTags,
    getAllTagUsageCounts,
    getCachedTags,
    ensureTagsLoaded,
    tagsVersion,
    logTaskActivity: recordTaskActivity,
  }), [
        tasks,
        trashedTasks,
        abandonedTasks,
        loading,
    trashedLoading,
    abandonedLoading,
    trashedLoaded,
    abandonedLoaded,
        selectedTask,
        selectedProject,
        addTask,
        updateTask,
        moveToTrash,
        restoreFromTrash,
        deleteTask,
        abandonTask,
        restoreAbandonedTask,
    loadTrashedTasks,
    loadAbandonedTasks,
        selectTask,
        selectProject,
        reorderTasks,
    getProjectTaskCountForProject,
        getTrashCount,
        getAbandonedCount,
        getTaskTags,
        attachTagToTask,
        detachTagFromTask,
        listAllTags,
        createTag,
        deleteTagPermanently,
        updateTagProject,
        renameTag,
        refreshAllTags,
        getAllTagUsageCounts,
        getCachedTags,
        ensureTagsLoaded,
        tagsVersion,
        recordTaskActivity,
  ]);

  return (
    <TaskContext.Provider value={contextValue}>
      {children}
    </TaskContext.Provider>
  );
};
