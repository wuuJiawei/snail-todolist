
import React, { useState, ReactNode, useEffect, useMemo, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Task } from "@/types/task";
import {
  addTask as addTaskService,
  updateTask as updateTaskService,
  deleteTask as deleteTaskService,
  moveToTrash as moveToTrashService,
  restoreFromTrash as restoreFromTrashService,
  abandonTask as abandonTaskService,
  restoreAbandonedTask as restoreAbandonedTaskService,
} from "@/services/taskService";
import { useToast } from "@/hooks/use-toast";
import { TaskContext } from "./TaskContext";
import { getProjectTaskCount, getSavedProject } from "./taskUtils";
import { SELECTED_PROJECT_KEY } from "./types";
import { useAuth } from "@/contexts/AuthContext";
import { useDeadlineNotifications } from "@/hooks/useDeadlineNotifications";
import { Tag } from "@/types/tag";
import { fetchAllTags as fetchAllTagsService, getTagsByTaskIds as getTagsByTaskIdsService, attachTagToTask as attachTagToTaskService, detachTagFromTask as detachTagFromTaskService, createTag as createTagService, deleteTagById as deleteTagByIdService, updateTagProject as updateTagProjectService } from "@/services/tagService";
import { useTaskStore } from "@/store/taskStore";
import { taskKeys, taskQueries } from "@/queries/taskQueries";
import { tagKeys, tagQueries } from "@/queries/tagQueries";
import { createTaskActivity } from "@/services/taskActivityService";
import { taskActivityKeys } from "@/queries/taskActivityQueries";
import type { TaskActivityAction, TaskActivityInput } from "@/types/taskActivity";
import { useProjectContext } from "@/contexts/ProjectContext";
import { isOfflineMode } from "@/storage";

const hasProp = <K extends keyof Partial<Task>>(obj: Partial<Task>, key: K): boolean =>
  Object.prototype.hasOwnProperty.call(obj, key);

const attachmentsSignature = (list: Task["attachments"] = []) =>
  JSON.stringify((list ?? []).map((att) => ({ id: att.id, url: att.url, filename: att.filename })));

const attachmentsEqual = (a?: Task["attachments"], b?: Task["attachments"]) =>
  attachmentsSignature(a) === attachmentsSignature(b);

const statusLabel = (completed?: boolean) => (completed ? "completed" : "active");

const buildTaskActivityDrafts = (
  previous: Task | undefined,
  updates: Partial<Task>
): TaskActivityInput[] => {
  if (!previous) return [];
  const drafts: TaskActivityInput[] = [];

  if (hasProp(updates, "title") && updates.title !== previous.title) {
    drafts.push({
      action: "title_updated",
      metadata: { from: previous.title ?? "", to: updates.title ?? "" },
    });
  }

  if (hasProp(updates, "description") && updates.description !== previous.description) {
    drafts.push({
      action: "description_updated",
      metadata: {
        previousLength: previous.description?.length ?? 0,
        nextLength: updates.description?.length ?? 0,
      },
    });
  }

  if (hasProp(updates, "completed") && updates.completed !== previous.completed) {
    drafts.push({
      action: "status_updated",
      metadata: {
        from: statusLabel(previous.completed),
        to: statusLabel(updates.completed),
      },
    });
  }

  if (hasProp(updates, "flagged") && updates.flagged !== previous.flagged) {
    drafts.push({
      action: updates.flagged ? "task_flagged" : "task_unflagged",
      metadata: {
        flagged: updates.flagged ?? false,
      },
    });
  }

  if (hasProp(updates, "date") && updates.date !== previous.date) {
    drafts.push({
      action: "due_date_updated",
      metadata: {
        from: previous.date ?? null,
        to: updates.date ?? null,
      },
    });
  }

  if (hasProp(updates, "project") && updates.project !== previous.project) {
    drafts.push({
      action: "project_changed",
      metadata: {
        from: previous.project ?? null,
        to: updates.project ?? null,
      },
    });
  }

  if (hasProp(updates, "attachments") && !attachmentsEqual(previous.attachments, updates.attachments)) {
    drafts.push({
      action: "attachments_updated",
      metadata: {
        previousCount: previous.attachments?.length ?? 0,
        nextCount: updates.attachments?.length ?? 0,
      },
    });
  }

  return drafts;
};

interface TaskProviderProps {
  children: ReactNode;
}

export const TaskProvider: React.FC<TaskProviderProps> = ({ children }) => {
  const tasks = useTaskStore((state) => state.tasks);
  const trashedTasks = useTaskStore((state) => state.trashedTasks);
  const abandonedTasks = useTaskStore((state) => state.abandonedTasks);
  const loading = useTaskStore((state) => state.loading);
  const trashedLoading = useTaskStore((state) => state.trashedLoading);
  const abandonedLoading = useTaskStore((state) => state.abandonedLoading);
  const trashedLoaded = useTaskStore((state) => state.trashedLoaded);
  const abandonedLoaded = useTaskStore((state) => state.abandonedLoaded);
  const hasLoaded = useTaskStore((state) => state.hasLoaded);
  const selectedTaskId = useTaskStore((state) => state.selectedTaskId);
  const taskIdToTags = useTaskStore((state) => state.taskIdToTags);
  const tagsCache = useTaskStore((state) => state.tagsCache);
  const tagsVersion = useTaskStore((state) => state.tagsVersion);
  const setTasks = useTaskStore((state) => state.setTasks);
  const setTrashedTasks = useTaskStore((state) => state.setTrashedTasks);
  const setAbandonedTasks = useTaskStore((state) => state.setAbandonedTasks);
  const setSelectedTaskId = useTaskStore((state) => state.setSelectedTaskId);
  const setLoading = useTaskStore((state) => state.setLoading);
  const setTrashedLoading = useTaskStore((state) => state.setTrashedLoading);
  const setAbandonedLoading = useTaskStore((state) => state.setAbandonedLoading);
  const setTrashedLoaded = useTaskStore((state) => state.setTrashedLoaded);
  const setAbandonedLoaded = useTaskStore((state) => state.setAbandonedLoaded);
  const setHasLoaded = useTaskStore((state) => state.setHasLoaded);
  const setTaskIdToTags = useTaskStore((state) => state.setTaskIdToTags);
  const setTagsCache = useTaskStore((state) => state.setTagsCache);
  const incrementTagsVersion = useTaskStore((state) => state.incrementTagsVersion);

  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedProject, setSelectedProject] = useState<string>(getSavedProject());
  const { projects, loading: projectsLoading } = useProjectContext();
  const builtinScopes = useMemo(() => new Set(["recent","today","flagged","completed","abandoned","trash"]), []);

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

  const queryClient = useQueryClient();

  const recordTaskActivity = useCallback(async (taskId: string, action: TaskActivityAction, metadata?: Record<string, unknown>) => {
    try {
      await createTaskActivity(taskId, action, metadata);
      queryClient.invalidateQueries({ queryKey: taskActivityKeys.byTask(taskId) });
    } catch (error) {
      console.error("Failed to record task activity:", error);
    }
  }, [queryClient]);

  const {
    data: activeTasks = [],
    isPending: isActivePending,
    isSuccess: isActiveSuccess,
  } = useQuery({
    ...taskQueries.active(),
    enabled: !!user || isOfflineMode,
  });

  useEffect(() => {
    if (user || isOfflineMode) return;
        setTasks([]);
        setTrashedTasks([]);
        setAbandonedTasks([]);
        setTaskIdToTags({});
    setTagsCache({});
    setTrashedLoaded(false);
    setAbandonedLoaded(false);
    setTrashedLoading(false);
    setAbandonedLoading(false);
        setLoading(false);
        setHasLoaded(false);
    setSelectedTaskId(null);
    queryClient.removeQueries({ queryKey: taskKeys.all });
  }, [user, setTasks, setTrashedTasks, setAbandonedTasks, setTaskIdToTags, setTagsCache, setTrashedLoaded, setAbandonedLoaded, setTrashedLoading, setAbandonedLoading, setLoading, setHasLoaded, setSelectedTaskId, queryClient]);

  useEffect(() => {
    setLoading(isActivePending);
  }, [isActivePending, setLoading]);

  useEffect(() => {
    if (!isActiveSuccess) return;
    // Avoid overriding local manual order while saving or shortly after a manual reorder
    const now = Date.now();
    if (savingSortRef.current || pendingReorderRef.current || now - lastManualOrderAtRef.current < 1500) {
      return;
    }

    setTasks(activeTasks);

    if (!hasLoaded) {
      setTrashedTasks([]);
      setAbandonedTasks([]);
      setTrashedLoaded(false);
      setAbandonedLoaded(false);
      setTrashedLoading(false);
      setAbandonedLoading(false);
      setTagsCache({});
    }

    setHasLoaded(true);

    const loadTagsForTasks = async () => {
      const activeTaskIds = activeTasks.map((task) => task.id);
      if (activeTaskIds.length === 0) {
        setTaskIdToTags({});
        return;
      }

      try {
        const mapping = await getTagsByTaskIdsService(activeTaskIds);
        setTaskIdToTags(mapping);
        incrementTagsVersion();
      } catch (error) {
        console.error("Failed to load tags for tasks:", error);
      }
    };

    loadTagsForTasks();
  }, [activeTasks, isActiveSuccess, hasLoaded, setTasks, setTrashedTasks, setAbandonedTasks, setTrashedLoaded, setAbandonedLoaded, setTrashedLoading, setAbandonedLoading, setTagsCache, setHasLoaded, setTaskIdToTags, incrementTagsVersion]);

  // Add task
  const addTask = useCallback(async (task: Omit<Task, "id">) => {
    try {
      // In offline mode, we use the mock offline user
      if (!user && !isOfflineMode) {
        toast({
          title: "添加失败",
          description: "您需要登录才能添加任务",
          variant: "destructive"
        });
        return;
      }

      let newTask: Task | null = null;

      if (isOfflineMode) {
        // In offline mode, use IndexedDB storage directly
        const { getStorage, initializeStorage } = await import("@/storage");
        await initializeStorage();
        const storage = getStorage();
        newTask = await storage.createTask({
          ...task,
          user_id: 'offline-user'
        });
      } else {
        // Ensure task has the current user's ID
        const taskWithUserId = {
          ...task,
          user_id: user?.id || 'offline-user'
        };
        newTask = await addTaskService(taskWithUserId);
      }

      if (!newTask) {
        throw new Error("add task failed");
      }

      setTasks((current) => [newTask!, ...current]);
      await recordTaskActivity(newTask.id, "task_created", { title: newTask.title });
      queryClient.invalidateQueries({ queryKey: taskKeys.active() });
    } catch (error) {
      console.error("Failed to add task:", error);
      throw error;
    }
  }, [user, toast, setTasks, queryClient, recordTaskActivity]);

  // Update task
  const updateTask = useCallback(async (id: string, updatedTask: Partial<Task>) => {
      // In offline mode, we use the mock offline user
      if (!user && !isOfflineMode) {
        toast({
          title: "更新失败",
          description: "您需要登录才能更新任务",
          variant: "destructive"
        });
        return;
      }

    const previousTasks = useTaskStore.getState().tasks;
    const previousTask = previousTasks.find((task) => task.id === id);
    const drafts = buildTaskActivityDrafts(previousTask, updatedTask);
    const isCompletionToggle = Object.prototype.hasOwnProperty.call(updatedTask, "completed");

    // Helper function to perform the actual update
    const performUpdate = async (): Promise<Task | null> => {
      if (isOfflineMode) {
        const { getStorage, initializeStorage } = await import("@/storage");
        await initializeStorage();
        const storage = getStorage();
        return storage.updateTask(id, updatedTask);
      } else {
        return updateTaskService(id, updatedTask);
      }
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
  }, [toast, user, setTasks, queryClient, recordTaskActivity]);

  const loadTrashedTasks = useCallback(async () => {
    if (!user && !isOfflineMode) return;
    if (trashedLoaded || trashedLoading) return;

    setTrashedLoading(true);
    try {
      const data = await queryClient.ensureQueryData(taskQueries.trashed());
      setTrashedTasks(data);
      setTrashedLoaded(true);
    } catch (error) {
      console.error("Failed to load trashed tasks:", error);
      toast({
        title: "读取垃圾桶失败",
        description: "无法获取垃圾桶任务，请稍后再试",
        variant: "destructive",
      });
    } finally {
      setTrashedLoading(false);
    }
  }, [user, trashedLoaded, trashedLoading, toast, setTrashedLoading, setTrashedTasks, setTrashedLoaded, queryClient]);

  const loadAbandonedTasks = useCallback(async () => {
    if (!user && !isOfflineMode) return;
    if (abandonedLoaded || abandonedLoading) return;

    setAbandonedLoading(true);
    try {
      const data = await queryClient.ensureQueryData(taskQueries.abandoned());
      setAbandonedTasks(data);
      setAbandonedLoaded(true);
    } catch (error) {
      console.error("Failed to load abandoned tasks:", error);
      toast({
        title: "读取已放弃任务失败",
        description: "无法获取已放弃任务列表，请稍后再试",
        variant: "destructive",
      });
    } finally {
      setAbandonedLoading(false);
    }
  }, [user, abandonedLoaded, abandonedLoading, toast, setAbandonedLoading, setAbandonedTasks, setAbandonedLoaded, queryClient]);

  // tags helpers
  const getTaskTags = useCallback((taskId: string): Tag[] => taskIdToTags[taskId] || [], [taskIdToTags]);

  const attachTagToTask = useCallback(async (taskId: string, tagId: string, tagData?: Tag) => {
    const store = useTaskStore.getState();
    const previousMapping = store.taskIdToTags;
    const previousTags = previousMapping[taskId] || [];

    if (previousTags.some((tag) => tag.id === tagId)) {
      return;
    }

    const findTagById = (): Tag | undefined => {
      for (const list of Object.values(store.tagsCache)) {
        const found = list.find((tag) => tag.id === tagId);
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

    store.setTaskIdToTags({
      ...previousMapping,
      [taskId]: optimisticTags,
    });
    store.incrementTagsVersion();

    try {
      await attachTagToTaskService(taskId, tagId);
      await recordTaskActivity(taskId, "tag_added", {
        tagId,
        tagName: optimisticTag?.name ?? "",
      });
    } catch (error) {
      store.setTaskIdToTags(previousMapping);
      store.incrementTagsVersion();
      throw error;
    }
  }, [recordTaskActivity]);

  const detachTagFromTask = useCallback(async (taskId: string, tagId: string) => {
    const store = useTaskStore.getState();
    const previousMapping = store.taskIdToTags;
    const previousTags = previousMapping[taskId] || [];
    const removedTag = previousTags.find((tag) => tag.id === tagId);
    const nextTags = previousTags.filter((tag) => tag.id !== tagId);

    store.setTaskIdToTags({
      ...previousMapping,
      [taskId]: nextTags,
    });
    store.incrementTagsVersion();

    try {
      await detachTagFromTaskService(taskId, tagId);
      await recordTaskActivity(taskId, "tag_removed", {
        tagId,
        tagName: removedTag?.name ?? "",
      });
    } catch (error) {
      store.setTaskIdToTags(previousMapping);
      store.incrementTagsVersion();
      throw error;
    }
  }, [recordTaskActivity]);

  const keyForProject = (projectId?: string | null): string => {
    return (projectId ?? null) === null ? "global" : (projectId as string);
  };

  const mergeTagLists = (incoming: Tag[], existing: Tag[] = []) => {
    const map = new Map<string, Tag>();
    incoming.forEach((tag) => {
      if (!map.has(tag.id)) {
        map.set(tag.id, tag);
      }
    });
    existing.forEach((tag) => {
      if (!map.has(tag.id)) {
        map.set(tag.id, tag);
      }
    });
    return Array.from(map.values());
  };

  const listAllTags = useCallback(async (projectId?: string | null) => {
    if (projectId === undefined) {
      return await fetchAllTagsService(undefined);
    }
    
    const scope = projectId ?? null;
    const data = await queryClient.ensureQueryData(tagQueries.forScope(scope));
    const store = useTaskStore.getState();
    const nextCache: Record<string, Tag[]> = {
      ...store.tagsCache,
      [keyForProject(scope)]: mergeTagLists(data, store.tagsCache[keyForProject(scope)]),
    };

    let result: Tag[] = data;
    if (projectId !== null && projectId !== undefined) {
      const globalData = await queryClient.ensureQueryData(tagQueries.forScope(null));
      nextCache[keyForProject(null)] = mergeTagLists(globalData, nextCache[keyForProject(null)]);
      result = [...nextCache[keyForProject(scope)], ...nextCache[keyForProject(null)]];
    }
    
    store.setTagsCache(nextCache);
    store.incrementTagsVersion();

    return result;
  }, [queryClient]);

  // 刷新所有标签缓存
  const refreshAllTags = useCallback(async () => {
    try {
      await queryClient.invalidateQueries({ queryKey: tagKeys.all });
      const cacheKeys = Object.keys(useTaskStore.getState().tagsCache);
      const scopes = cacheKeys.length > 0 ? cacheKeys : ["global"];
      const results = await Promise.all(
      scopes.map((scope) => {
          const projectScope = scope === "global" ? null : scope;
          return queryClient.ensureQueryData(tagQueries.forScope(projectScope));
        })
      );

      const nextCache: Record<string, Tag[]> = {};
      scopes.forEach((scope, index) => {
        const prev = useTaskStore.getState().tagsCache[scope] || [];
        nextCache[scope] = mergeTagLists(results[index], prev);
      });

      const store = useTaskStore.getState();
      store.setTagsCache(nextCache);
      store.incrementTagsVersion();
      return true;
    } catch (error) {
      console.error("Failed to refresh tags:", error);
      return false;
    }
  }, [queryClient]);

  const ensureTagsLoaded = useCallback(async (projectId?: string | null) => {
    const store = useTaskStore.getState();
    const nextCache: Record<string, Tag[]> = { ...store.tagsCache };

    const loadScope = async (scope: string | null) => {
      const data = await queryClient.ensureQueryData(tagQueries.forScope(scope));
      const key = keyForProject(scope);
      nextCache[key] = mergeTagLists(data, nextCache[key]);
    };

    if (projectId !== null && projectId !== undefined) {
      await loadScope(null);
    }

    await loadScope(projectId ?? null);

    store.setTagsCache(nextCache);
    store.incrementTagsVersion();
  }, [queryClient]);

  // 修改createTag函数，更新后刷新缓存
  const createTag = useCallback(async (name: string, projectId?: string | null) => {
    const tag = await createTagService(name, projectId);
    if (tag) {
      const store = useTaskStore.getState();
      const cache = store.tagsCache;
      const nextCache: Record<string, Tag[]> = { ...cache };
      const targetKey = keyForProject(projectId);
      const targetList = nextCache[targetKey] || [];
      nextCache[targetKey] = [tag, ...targetList.filter((t) => t.id !== tag.id)];
      store.setTagsCache(nextCache);
      store.incrementTagsVersion();

      await queryClient.invalidateQueries({ queryKey: tagKeys.all });
      if (projectId !== null && projectId !== undefined) {
        await ensureTagsLoaded(projectId);
      }
      await ensureTagsLoaded(null);
    }
    return tag;
  }, [queryClient, ensureTagsLoaded]);

  // 修改deleteTagPermanently函数
  const deleteTagPermanently = useCallback(async (tagId: string): Promise<boolean> => {
    const ok = await deleteTagByIdService(tagId);
    if (ok) {
      await queryClient.invalidateQueries({ queryKey: tagKeys.all });
      const cache = useTaskStore.getState().tagsCache;
      const nextCache: Record<string, Tag[]> = {};
      Object.keys(cache).forEach((k) => {
        nextCache[k] = (cache[k] || []).filter((t) => t.id !== tagId);
        });
      const store = useTaskStore.getState();
      store.setTagsCache(nextCache);
      const mapping = useTaskStore.getState().taskIdToTags;
      const mappingNext: Record<string, Tag[]> = {};
      Object.keys(mapping).forEach((taskId) => {
        mappingNext[taskId] = (mapping[taskId] || []).filter((t) => t.id !== tagId);
        });
      store.setTaskIdToTags(mappingNext);
      store.incrementTagsVersion();
    }
    return ok;
  }, [queryClient]);

  // 修改updateTagProject函数
  const updateTagProject = useCallback(async (tagId: string, projectId: string | null): Promise<Tag | null> => {
    const updatedTag = await updateTagProjectService(tagId, projectId);
    if (updatedTag) {
      await queryClient.invalidateQueries({ queryKey: tagKeys.all });
      const cache = useTaskStore.getState().tagsCache;
      const next = { ...cache };
      Object.keys(next).forEach((key) => {
        next[key] = (next[key] || []).filter((t) => t.id !== tagId);
        });
      const targetKey = projectId === null ? "global" : projectId;
      const targetList = next[targetKey] || [];
      next[targetKey] = [updatedTag, ...targetList];
      const store = useTaskStore.getState();
      store.setTagsCache(next);
      store.incrementTagsVersion();
    }
    return updatedTag;
  }, [queryClient]);

  const getAllTagUsageCounts = useCallback(() => {
    const counts: Record<string, number> = {};
    const pendingTasks = useTaskStore
      .getState()
      .tasks.filter(task => !task.completed && !task.abandoned);
    pendingTasks.forEach(task => {
      const tags = taskIdToTags[task.id] || [];
      tags.forEach(tag => {
        counts[tag.id] = (counts[tag.id] || 0) + 1;
      });
    });
    return counts;
  }, [taskIdToTags]);

  // 全局标签：不再区分 projectId，统一使用 'global' 作为缓存键
  const getCachedTags = useCallback((projectId?: string | null): Tag[] => {
    const key = keyForProject(projectId);
    let projectSpecificTags = tagsCache[key];
    if (!projectSpecificTags) {
      projectSpecificTags = queryClient.getQueryData<Tag[]>(tagKeys.forScope(projectId ?? null)) || [];
    }
    
    if (projectId !== null && projectId !== undefined) {
      let globalTags = tagsCache["global"];
      if (!globalTags) {
        globalTags = queryClient.getQueryData<Tag[]>(tagKeys.forScope(null)) || [];
      }
      return [...projectSpecificTags, ...globalTags];
    }
    
    return projectSpecificTags;
  }, [tagsCache, queryClient]);

  // Move task to trash (soft delete)
  const moveToTrash = useCallback(async (id: string) => {
    try {
      // In offline mode, we use the mock offline user
      if (!user && !isOfflineMode) {
        toast({
          title: "删除失败",
          description: "您需要登录才能删除任务",
          variant: "destructive"
        });
        return;
      }

      let success = false;
      if (isOfflineMode) {
        const { getStorage, initializeStorage } = await import("@/storage");
        await initializeStorage();
        const storage = getStorage();
        const updated = await storage.updateTask(id, { deleted: true, deleted_at: new Date().toISOString() });
        success = !!updated;
      } else {
        success = await moveToTrashService(id);
      }

      if (!success) {
        throw new Error("move to trash failed");
      }

      const { tasks: currentTasks, trashedTasks: currentTrashed } = useTaskStore.getState();
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
  }, [user, toast, selectedTaskId, setTasks, setTrashedTasks, setSelectedTaskId, queryClient, recordTaskActivity]);

  // Restore task from trash
  const restoreFromTrash = useCallback(async (id: string) => {
    try {
      // In offline mode, we use the mock offline user
      if (!user && !isOfflineMode) {
        toast({
          title: "恢复失败",
          description: "您需要登录才能恢复任务",
          variant: "destructive"
        });
        return;
      }

      let success = false;
      if (isOfflineMode) {
        const { getStorage, initializeStorage } = await import("@/storage");
        await initializeStorage();
        const storage = getStorage();
        const updated = await storage.updateTask(id, { deleted: false, deleted_at: undefined });
        success = !!updated;
      } else {
        success = await restoreFromTrashService(id);
      }

      if (!success) {
        throw new Error("restore from trash failed");
      }

        // Find the task before removing it from the trashed tasks list
      const { trashedTasks: currentTrashed, tasks: currentTasks } = useTaskStore.getState();
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
  }, [user, toast, setTrashedTasks, setTasks, queryClient, recordTaskActivity]);

  // Permanently delete task
  const deleteTask = useCallback(async (id: string) => {
    try {
      // In offline mode, we use the mock offline user
      if (!user && !isOfflineMode) {
        toast({
          title: "删除失败",
          description: "您需要登录才能删除任务",
          variant: "destructive"
        });
        return;
      }

      let success = false;
      if (isOfflineMode) {
        const { getStorage, initializeStorage } = await import("@/storage");
        await initializeStorage();
        const storage = getStorage();
        success = await storage.deleteTask(id);
      } else {
        success = await deleteTaskService(id);
      }

      if (!success) {
        throw new Error("delete task failed");
      }

        // Remove from trashed tasks
      const { trashedTasks: currentTrashed, tasks: currentTasks } = useTaskStore.getState();
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
  }, [user, toast, selectedTaskId, setTrashedTasks, setTasks, setSelectedTaskId, queryClient]);

  useEffect(() => {
    if (!user && !isOfflineMode) return;
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
    // Skip realtime subscriptions in offline mode
    if (isOfflineMode) return;
    if (!user) return;
    const uid = user.id;
    const invalidate = () => queryClient.invalidateQueries({ queryKey: taskKeys.active() });
    const channels: ReturnType<typeof supabase.channel>[] = [];

    // 1) 订阅属于当前用户的任务变更
    const chUser = supabase.channel(`tasks:user:${uid}`);
    chUser.on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `user_id=eq.${uid}` }, invalidate).subscribe();
    channels.push(chUser);

    // 2) 订阅可见清单内任务的变更（按 50 个一组分片）
    const chunkSize = 50;
    for (let i = 0; i < narrowedProjectIds.length; i += chunkSize) {
      const group = narrowedProjectIds.slice(i, i + chunkSize);
      if (group.length === 0) continue;
      const inList = group.map(id => `"${id}"`).join(",");
      const ch = supabase.channel(`tasks:projects:${uid}:${i / chunkSize}`);
      ch.on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `project=in.(${inList})` }, invalidate).subscribe();
      channels.push(ch);
    }

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch));
    };
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

  // Reorder tasks
  const SORT_ORDER_STEP = 1000;

  const savingSortRef = useRef(false);
  type PendingReorder = { projectId: string; movedId: string; prevId?: string; nextId?: string; isCompletedArea: boolean };
  const pendingReorderRef = useRef<PendingReorder | null>(null);
  const lastManualOrderAtRef = useRef<number>(0);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (savingSortRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  const reorderTasks = useCallback(async (projectId: string, sourceIndex: number, destinationIndex: number, isCompletedArea = false) => {
    // If source and destination are the same, no need to reorder
    if (sourceIndex === destinationIndex) return;

    // Get only tasks for the specific project based on completion status
    const currentTasks = useTaskStore.getState().tasks;
    const projectTasks = currentTasks.filter(
      (task) => task.project === projectId && Boolean(task.completed) === isCompletedArea
    );

    if (projectTasks.length === 0) {
      return;
    }

    // Keep a copy of the previous state in case we need to roll back
    const previousTasksSnapshot = currentTasks.map((task) => ({ ...task }));

    // Create a copy of the array
    const reorderedProjectTasks = [...projectTasks];

    // Remove the task from the source position and insert at destination
    const [removed] = reorderedProjectTasks.splice(sourceIndex, 1);
    reorderedProjectTasks.splice(destinationIndex, 0, removed);

    const extractSortOrder = (task: Task) => {
      if (typeof task.sort_order === "number" && !Number.isNaN(task.sort_order)) {
        return task.sort_order;
      }
      if (task.sort_order !== undefined) {
        const parsed = Number(task.sort_order);
        return Number.isNaN(parsed) ? undefined : parsed;
      }
      return undefined;
    };

    const existingOrders = projectTasks
      .map(extractSortOrder)
      .filter((value): value is number => value !== undefined);

    const baseOrder =
      existingOrders.length > 0
        ? Math.min(...existingOrders) - SORT_ORDER_STEP
        : 0;

    const prev = reorderedProjectTasks[destinationIndex - 1];
    const next = reorderedProjectTasks[destinationIndex + 1];

    const prevOrder = prev
      ? extractSortOrder(prev) ?? baseOrder + (reorderedProjectTasks.indexOf(prev) + 1) * SORT_ORDER_STEP
      : undefined;
    const nextOrder = next
      ? extractSortOrder(next) ?? baseOrder + (reorderedProjectTasks.indexOf(next) + 1) * SORT_ORDER_STEP
      : undefined;

    const newOrder =
      prevOrder != null && nextOrder != null
        ? (prevOrder + nextOrder) / 2
        : prevOrder != null
          ? prevOrder + SORT_ORDER_STEP
          : nextOrder != null
            ? nextOrder - SORT_ORDER_STEP
            : baseOrder + SORT_ORDER_STEP;

    const movedUpdated = { ...removed, sort_order: newOrder } as Task;
    const areaMatch = (t: Task) => t.project === projectId && Boolean(t.completed) === isCompletedArea;
    const otherTasks = currentTasks.filter((t) => !areaMatch(t));
    const nextTasks = [
      ...reorderedProjectTasks.map((t) => (t.id === movedUpdated.id ? movedUpdated : t)),
      ...otherTasks,
    ];

    // Optimistically update the local store
    setTasks(nextTasks);
    lastManualOrderAtRef.current = Date.now();

    if (savingSortRef.current) {
      pendingReorderRef.current = {
        projectId,
        movedId: movedUpdated.id,
        prevId: prev?.id,
        nextId: next?.id,
        isCompletedArea,
      };
      return;
    }

    // Persist only the moved task's order
    try {
      savingSortRef.current = true;
      // 保存排序
      const isGuest = !user;
      const saved = await updateTaskService(movedUpdated.id, { sort_order: newOrder }, isGuest);
      if (!saved) throw new Error("Failed to persist updated sort order");

      // Sync query cache without triggering refetch to avoid flicker
      queryClient.setQueryData(taskKeys.active(), useTaskStore.getState().tasks);
      toast({ title: "已保存排序" });
    } catch (error) {
      console.error('Failed to update task order in database:', error);
      // Roll back optimistic update
      setTasks(previousTasksSnapshot);
      toast({
        title: "排序保存失败",
        description: "任务顺序已在本地更新，但未能保存到服务器",
        variant: "destructive"
      });
    }
    finally {
      savingSortRef.current = false;
      while (pendingReorderRef.current) {
        const job = pendingReorderRef.current;
        pendingReorderRef.current = null;

        const currentTasks2 = useTaskStore.getState().tasks;
        const projectTasks2 = currentTasks2.filter(
          (task) => task.project === job.projectId && Boolean(task.completed) === job.isCompletedArea
        );

        const existingOrders2 = projectTasks2
          .map(extractSortOrder)
          .filter((value): value is number => value !== undefined);

        const baseOrder2 =
          existingOrders2.length > 0 ? Math.min(...existingOrders2) - SORT_ORDER_STEP : 0;

        const prev2 = job.prevId ? projectTasks2.find((t) => t.id === job.prevId) : undefined;
        const next2 = job.nextId ? projectTasks2.find((t) => t.id === job.nextId) : undefined;

        const prevOrder2 = prev2
          ? extractSortOrder(prev2) ?? baseOrder2 + (projectTasks2.indexOf(prev2) + 1) * SORT_ORDER_STEP
          : undefined;
        const nextOrder2 = next2
          ? extractSortOrder(next2) ?? baseOrder2 + (projectTasks2.indexOf(next2) + 1) * SORT_ORDER_STEP
          : undefined;

        const newOrder2 =
          prevOrder2 != null && nextOrder2 != null
            ? (prevOrder2 + nextOrder2) / 2
            : prevOrder2 != null
              ? prevOrder2 + SORT_ORDER_STEP
              : nextOrder2 != null
                ? nextOrder2 - SORT_ORDER_STEP
                : baseOrder2 + SORT_ORDER_STEP;

        try {
          savingSortRef.current = true;
          // 保存排序
          const isGuest2 = !user;
          const saved2 = await updateTaskService(job.movedId, { sort_order: newOrder2 }, isGuest2);
          if (!saved2) throw new Error("Failed to persist updated sort order");
          queryClient.setQueryData(taskKeys.active(), useTaskStore.getState().tasks);
          toast({ title: "已保存排序" });
        } catch (err) {
          console.error('Failed to process queued task order:', err);
          toast({
            title: "排序保存失败",
            description: "存在未保存的排序变更未能同步到服务器",
            variant: "destructive",
          });
        } finally {
          savingSortRef.current = false;
        }
      }
    }
  }, [toast, setTasks, queryClient, user]);

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
      // In offline mode, we use the mock offline user
      if (!user && !isOfflineMode) {
        toast({
          title: "放弃失败",
          description: "您需要登录才能放弃任务",
          variant: "destructive"
        });
        return;
      }

      const success = await abandonTaskService(id);
      if (!success) {
        throw new Error("abandon task failed");
      }

        // Find the task before removing it from the tasks list
      const { tasks: currentTasks, abandonedTasks: currentAbandoned } = useTaskStore.getState();
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
  }, [user, toast, selectedTaskId, setTasks, setAbandonedTasks, setSelectedTaskId, queryClient, recordTaskActivity]);

  // Restore task from abandoned
  const restoreAbandonedTask = useCallback(async (id: string) => {
    try {
      // In offline mode, we use the mock offline user
      if (!user && !isOfflineMode) {
        toast({
          title: "恢复失败",
          description: "您需要登录才能恢复任务",
          variant: "destructive"
        });
        return;
      }

      const success = await restoreAbandonedTaskService(id);
      if (!success) {
        throw new Error("restore abandoned task failed");
      }

        // Find the task before removing it from the abandoned tasks list
      const { abandonedTasks: currentAbandoned, tasks: currentTasks } = useTaskStore.getState();
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
  }, [user, toast, setAbandonedTasks, setTasks, queryClient, recordTaskActivity]);

  // Get the count of tasks in trash
  const getTrashCount = useCallback(() => {
    return useTaskStore.getState().trashedTasks.length;
  }, []);

  // Get the count of abandoned tasks
  const getAbandonedCount = useCallback(() => {
    return useTaskStore.getState().abandonedTasks.length;
  }, []);

  const getProjectTaskCountForProject = useCallback((projectId: string) => {
    return getProjectTaskCount(useTaskStore.getState().tasks, projectId);
  }, []);

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
