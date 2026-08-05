
import React, { useState, ReactNode, useEffect, useMemo, useCallback } from "react";
import { getDataProvider } from "@/data";
import { DataError } from "@/data/contracts/errors";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Task } from "@/types/task";
import { useToast } from "@/hooks/use-toast";
import { TaskContext } from "./TaskContext";
import { getProjectTaskCount, getSavedProject } from "./taskUtils";
import { SELECTED_PROJECT_KEY } from "./types";
import { useAuth } from "@/contexts/AuthContext";
import { useDeadlineNotifications } from "@/hooks/useDeadlineNotifications";
import { Tag } from "@/types/tag";
import { taskKeys, taskQueries } from "@/queries/taskQueries";
import { tagKeys, tagQueries } from "@/queries/tagQueries";
import { useProjectContext } from "@/contexts/ProjectContext";
import * as storageOps from "@/data/operations";
import { canPerformOperation, requiresAuth } from "@/data/operations";
import { buildTaskActivityDrafts, useTaskActivityRecorder } from "./useTaskActivityRecorder";
import { useTaskReorder } from "./useTaskReorder";

interface TaskProviderProps {
  children: ReactNode;
}

const EMPTY_TASKS: Task[] = [];
const EMPTY_TASK_TAGS: Record<string, Tag[]> = {};

export const TaskProvider: React.FC<TaskProviderProps> = ({ children }) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [tagsVersion, setTagsVersion] = useState(0);
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
    () => tasks.filter((task) => !task.id.startsWith("temp-")).map((task) => task.id),
    [tasks],
  );
  const taskMappingKey = useMemo(() => tagKeys.forTasks(tagTaskIds), [tagTaskIds]);
  const { data: taskIdToTags = EMPTY_TASK_TAGS } = useQuery({
    ...tagQueries.forTasks(tagTaskIds),
    enabled: canPerformOperation(user),
    placeholderData: (previous) => previous,
  });
  const incrementTagsVersion = useCallback(() => setTagsVersion((version) => version + 1), []);
  const setTaskIdToTags = useCallback((mapping: Record<string, Tag[]>) => {
    queryClient.setQueryData(taskMappingKey, mapping);
  }, [queryClient, taskMappingKey]);

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

    // 生成临时 ID 用于乐观更新
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    // 构建乐观任务对象
    const optimisticTask: Task = {
      id: tempId,
      ...task,
      user_id: user!.id,
      completed: task.completed ?? false,
      attachments: task.attachments ?? [],
      _isPending: true,
      _tempId: tempId,
    };

    // 立即更新 UI（乐观更新）
    setTasks((current) => [optimisticTask, ...current]);

    try {
      const taskWithUserId = {
        ...task,
        user_id: user!.id
      };
      const newTask = await storageOps.addTask(taskWithUserId);

      if (!newTask) {
        throw new Error("add task failed");
      }

      // 用真实任务替换乐观任务
      setTasks((current) => 
        current.map((t) => 
          t.id === tempId ? { ...newTask, _isPending: false } : t
        )
      );

      await recordTaskActivity(newTask.id, "task_created", { title: newTask.title });
      queryClient.invalidateQueries({ queryKey: taskKeys.active() });
    } catch (error) {
      // 回滚：移除乐观任务
      setTasks((current) => current.filter((t) => t.id !== tempId));
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

    const previousTasks = getCachedTasks(taskKeys.active());
    const previousTask = previousTasks.find((task) => task.id === id);
    const drafts = buildTaskActivityDrafts(previousTask, updatedTask);
    const isCompletionToggle = Object.prototype.hasOwnProperty.call(updatedTask, "completed");

    // Helper function to perform the actual update
    const performUpdate = async (): Promise<Task | null> => {
      return storageOps.updateTask(id, updatedTask);
    };

    if (isCompletionToggle) {
      try {
        const updated = await performUpdate();
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
      return;
    }

    const timestamp = new Date().toISOString();
    const updatedTasks = previousTasks.map((task) => {
      if (task.id !== id) return task;

      const nextTask: Task = {
        ...task,
        ...updatedTask,
      };

      if (Object.prototype.hasOwnProperty.call(updatedTask, "completed")) {
        if (updatedTask.completed) {
          nextTask.completed_at = timestamp;
        } else {
          nextTask.completed_at = undefined;
        }
      }

      return nextTask;
    });
    setTasks(updatedTasks);

    try {
      const updated = await performUpdate();
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
      setTasks(previousTasks);
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

  // tags helpers
  const getTaskTags = useCallback((taskId: string): Tag[] => taskIdToTags[taskId] || [], [taskIdToTags]);

  const attachTagToTask = useCallback(async (taskId: string, tagId: string, tagData?: Tag) => {
    const previousMapping = queryClient.getQueryData<Record<string, Tag[]>>(taskMappingKey) ?? taskIdToTags;
    const previousTags = previousMapping[taskId] || [];
    if (previousTags.some((tag) => tag.id === tagId)) return;

    const findTagById = (): Tag | undefined => {
      const cachedLists = queryClient.getQueriesData<Tag[]>({ queryKey: tagKeys.scopes() });
      for (const [, list] of cachedLists) {
        const found = list?.find((tag) => tag.id === tagId);
        if (found) return found;
      }
      for (const list of Object.values(previousMapping)) {
        const found = (list || []).find((tag) => tag.id === tagId);
        if (found) return found;
      }
      return undefined;
    };

    const optimisticTag = tagData ?? findTagById();
    const optimisticTags = optimisticTag ? [...previousTags, optimisticTag] : previousTags;
    setTaskIdToTags({
      ...previousMapping,
      [taskId]: optimisticTags,
    });
    incrementTagsVersion();

    try {
      await storageOps.attachTagToTask(taskId, tagId);
      await recordTaskActivity(taskId, "tag_added", {
        tagId,
        tagName: optimisticTag?.name ?? "",
      });
    } catch (error) {
      setTaskIdToTags(previousMapping);
      incrementTagsVersion();
      toast({ title: "关联失败", description: "无法给任务添加标签", variant: "destructive" });
      throw error;
    }
  }, [queryClient, taskMappingKey, taskIdToTags, setTaskIdToTags, incrementTagsVersion, recordTaskActivity, toast]);

  const detachTagFromTask = useCallback(async (taskId: string, tagId: string) => {
    const previousMapping = queryClient.getQueryData<Record<string, Tag[]>>(taskMappingKey) ?? taskIdToTags;
    const previousTags = previousMapping[taskId] || [];
    const removedTag = previousTags.find((tag) => tag.id === tagId);
    const nextTags = previousTags.filter((tag) => tag.id !== tagId);

    setTaskIdToTags({
      ...previousMapping,
      [taskId]: nextTags,
    });
    incrementTagsVersion();

    try {
      await storageOps.detachTagFromTask(taskId, tagId);
      await recordTaskActivity(taskId, "tag_removed", {
        tagId,
        tagName: removedTag?.name ?? "",
      });
    } catch (error) {
      setTaskIdToTags(previousMapping);
      incrementTagsVersion();
      toast({ title: "移除失败", description: "无法从任务移除标签", variant: "destructive" });
      throw error;
    }
  }, [queryClient, taskMappingKey, taskIdToTags, setTaskIdToTags, incrementTagsVersion, recordTaskActivity, toast]);

  const snapshotTagCache = useCallback(
    () => queryClient.getQueriesData({ queryKey: tagKeys.all }),
    [queryClient],
  );
  const restoreTagCache = useCallback((snapshot: Array<[readonly unknown[], unknown]>) => {
    queryClient.removeQueries({ queryKey: tagKeys.all });
    for (const [key, value] of snapshot) queryClient.setQueryData(key, value);
    incrementTagsVersion();
  }, [queryClient, incrementTagsVersion]);

  /**
   * 同步更新标签列表和任务—标签关系的 Query cache
   * @param tagId 标签 ID
   * @param updates 更新内容（如 name、project_id）
   * @param options 选项：removeFromCache 是否删除，oldProjectId 旧项目 ID（用于移动缓存桶）
   */
  const syncTagUpdate = useCallback((
    tagId: string,
    updates: Partial<Tag>,
    options?: {
      removeFromCache?: boolean;
      oldProjectId?: string | null;
    }
  ) => {
    const updateList = (list: Tag[] | undefined) => (list ?? []).map((tag) =>
      tag.id === tagId ? { ...tag, ...updates } : tag
    );
    if (options?.removeFromCache) {
      queryClient.setQueriesData<Tag[]>({ queryKey: tagKeys.scopes() }, (list) =>
        (list ?? []).filter((tag) => tag.id !== tagId)
      );
      queryClient.setQueryData<Tag[]>(tagKeys.allVisible(), (list = []) =>
        list.filter((tag) => tag.id !== tagId)
      );
    } else if (options?.oldProjectId !== undefined && updates.project_id !== undefined) {
      const oldList = queryClient.getQueryData<Tag[]>(tagKeys.forScope(options.oldProjectId)) ?? [];
      const movedTag = oldList.find((tag) => tag.id === tagId);
      queryClient.setQueryData<Tag[]>(tagKeys.forScope(options.oldProjectId),
        oldList.filter((tag) => tag.id !== tagId),
      );
      if (movedTag) {
        const updatedTag = { ...movedTag, ...updates };
        queryClient.setQueryData<Tag[]>(tagKeys.forScope(updates.project_id), (list = []) =>
          [updatedTag, ...list.filter((tag) => tag.id !== tagId)]
        );
      }
      queryClient.setQueryData<Tag[]>(tagKeys.allVisible(), updateList);
    } else {
      queryClient.setQueriesData<Tag[]>({ queryKey: tagKeys.scopes() }, updateList);
      queryClient.setQueryData<Tag[]>(tagKeys.allVisible(), updateList);
    }

    queryClient.setQueriesData<Record<string, Tag[]>>({ queryKey: tagKeys.taskMappings() }, (mapping = {}) =>
      Object.fromEntries(Object.entries(mapping).map(([taskId, tags]) => [
        taskId,
        options?.removeFromCache
          ? tags.filter((tag) => tag.id !== tagId)
          : tags.map((tag) => tag.id === tagId ? { ...tag, ...updates } : tag),
      ]))
    );
    incrementTagsVersion();
  }, [queryClient, incrementTagsVersion]);

  const listAllTags = useCallback(async (projectId?: string | null) => {
    if (projectId === undefined) {
      return queryClient.ensureQueryData(tagQueries.allVisible());
    }
    const scope = projectId ?? null;
    const data = await queryClient.ensureQueryData(tagQueries.forScope(scope));
    if (projectId !== null) {
      const globalData = await queryClient.ensureQueryData(tagQueries.forScope(null));
      return [...data, ...globalData];
    }
    return data;
  }, [queryClient]);

  // 刷新所有标签缓存
  const refreshAllTags = useCallback(async () => {
    try {
      await queryClient.invalidateQueries({ queryKey: tagKeys.all, refetchType: "all" });
      incrementTagsVersion();
      return true;
    } catch (error) {
      console.error("Failed to refresh tags:", error);
      return false;
    }
  }, [queryClient, incrementTagsVersion]);

  const ensureTagsLoaded = useCallback(async (projectId?: string | null) => {
    if (projectId !== null && projectId !== undefined) {
      await queryClient.ensureQueryData(tagQueries.forScope(null));
    }
    await queryClient.ensureQueryData(tagQueries.forScope(projectId ?? null));
    incrementTagsVersion();
  }, [queryClient, incrementTagsVersion]);

  // 修改createTag函数，更新后刷新缓存
  const createTag = useCallback(async (name: string, projectId?: string | null) => {
    try {
      const tag = await storageOps.createTag(name, projectId);
      queryClient.setQueryData<Tag[]>(tagKeys.forScope(projectId ?? null), (list = []) =>
        [tag, ...list.filter((existing) => existing.id !== tag.id)]
      );
      queryClient.setQueryData<Tag[]>(tagKeys.allVisible(), (list = []) =>
        [tag, ...list.filter((existing) => existing.id !== tag.id)]
      );
      incrementTagsVersion();
      return tag;
    } catch (error) {
      const conflict = error instanceof DataError && error.code === "CONFLICT";
      toast({
        title: conflict ? "标签已存在" : "创建失败",
        description: conflict ? `「${name}」已存在` : "无法创建标签",
        variant: conflict ? "default" : "destructive",
      });
      return null;
    }
  }, [queryClient, incrementTagsVersion, toast]);

  // 修改deleteTagPermanently函数
  const deleteTagPermanently = useCallback(async (tagId: string): Promise<boolean> => {
    const snapshot = snapshotTagCache();
    syncTagUpdate(tagId, {}, { removeFromCache: true });

    try {
      const ok = await storageOps.deleteTagById(tagId);
      if (!ok) {
        throw new Error("Delete tag failed");
      }
      await queryClient.invalidateQueries({ queryKey: tagKeys.all });
      return true;
    } catch (error) {
      restoreTagCache(snapshot);
      toast({
        title: "删除标签失败",
        variant: "destructive"
      });
      return false;
    }
  }, [queryClient, snapshotTagCache, syncTagUpdate, restoreTagCache, toast]);

  // 修改updateTagProject函数
  const updateTagProject = useCallback(async (tagId: string, projectId: string | null): Promise<Tag | null> => {
    const snapshot = snapshotTagCache();
    const cachedLists = queryClient.getQueriesData<Tag[]>({ queryKey: tagKeys.scopes() });
    const cachedTag = cachedLists.flatMap(([, list]) => list ?? []).find((tag) => tag.id === tagId);
    const oldProjectId = cachedTag?.project_id ?? null;

    // 乐观更新
    syncTagUpdate(tagId, { project_id: projectId }, { oldProjectId });

    try {
      const updatedTag = await storageOps.updateTagProject(tagId, projectId);
      if (!updatedTag) {
        throw new Error("Update tag project failed");
      }
      await queryClient.invalidateQueries({ queryKey: tagKeys.all });
      toast({
        title: "已更新",
        description: projectId === null ? "标签已设为全局可见" : "已更新标签可见范围",
      });
      return updatedTag;
    } catch (error) {
      restoreTagCache(snapshot);
      toast({
        title: "修改标签范围失败",
        variant: "destructive"
      });
      return null;
    }
  }, [queryClient, snapshotTagCache, syncTagUpdate, restoreTagCache, toast]);

  // 重命名标签
  const renameTag = useCallback(async (tagId: string, newName: string): Promise<Tag | null> => {
    const snapshot = snapshotTagCache();
    syncTagUpdate(tagId, { name: newName });

    try {
      const updatedTag = await storageOps.updateTag(tagId, { name: newName });
      if (!updatedTag) {
        throw new Error("Rename tag failed");
      }
      await queryClient.invalidateQueries({ queryKey: tagKeys.all });
      return updatedTag;
    } catch (error) {
      restoreTagCache(snapshot);
      toast({
        title: "重命名标签失败",
        variant: "destructive"
      });
      return null;
    }
  }, [queryClient, snapshotTagCache, syncTagUpdate, restoreTagCache, toast]);

  const getAllTagUsageCounts = useCallback(() => {
    const counts: Record<string, number> = {};
    const pendingTasks = tasks.filter(task => !task.completed && !task.abandoned);
    pendingTasks.forEach(task => {
      const tags = taskIdToTags[task.id] || [];
      tags.forEach(tag => {
        counts[tag.id] = (counts[tag.id] || 0) + 1;
      });
    });
    return counts;
  }, [tasks, taskIdToTags]);

  const getCachedTags = useCallback((projectId?: string | null): Tag[] => {
    const projectSpecificTags = queryClient.getQueryData<Tag[]>(tagKeys.forScope(projectId ?? null)) || [];
    if (projectId !== null && projectId !== undefined) {
      const globalTags = queryClient.getQueryData<Tag[]>(tagKeys.forScope(null)) || [];
      return [...projectSpecificTags, ...globalTags];
    }
    return projectSpecificTags;
  }, [queryClient]);

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
    return getDataProvider().tasks.subscribe(uid, narrowedProjectIds, invalidate);
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
