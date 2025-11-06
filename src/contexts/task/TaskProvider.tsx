
import React, { useState, ReactNode, useEffect, useMemo, useCallback } from "react";
import { Task } from "@/types/task";
import {
  fetchTasks,
  fetchDeletedTasks,
  fetchAbandonedTasks,
  addTask as addTaskService,
  updateTask as updateTaskService,
  deleteTask as deleteTaskService,
  moveToTrash as moveToTrashService,
  restoreFromTrash as restoreFromTrashService,
  abandonTask as abandonTaskService,
  restoreAbandonedTask as restoreAbandonedTaskService
} from "@/services/taskService";
import { useToast } from "@/hooks/use-toast";
import { TaskContext } from "./TaskContext";
import { getProjectTaskCount, getSavedProject } from "./taskUtils";
import { SELECTED_PROJECT_KEY } from "./types";
import { useAuth } from "@/contexts/AuthContext";
import { useDeadlineNotifications } from "@/hooks/useDeadlineNotifications";
import { Tag } from "@/types/tag";
import { fetchAllTags as fetchAllTagsService, getTagsByTaskIds as getTagsByTaskIdsService, attachTagToTask as attachTagToTaskService, detachTagFromTask as detachTagFromTaskService, createTag as createTagService, deleteTagById as deleteTagByIdService, updateTagProject as updateTagProjectService, renameTag as renameTagService } from "@/services/tagService";
import { useTaskStore } from "@/store/taskStore";

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
  const prependTask = useTaskStore((state) => state.prependTask);
  const replaceTaskById = useTaskStore((state) => state.replaceTaskById);
  const removeTask = useTaskStore((state) => state.removeTask);
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
  const insertOptimisticTask = useTaskStore((state) => state.insertOptimisticTask);

  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedProject, setSelectedProject] = useState<string>(getSavedProject());

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
  
  // Enable deadline notifications for all tasks
  useDeadlineNotifications({ 
    tasks, 
    enabled: true 
  });

  // 加载任务数据和标签数据
  useEffect(() => {
    const loadTasks = async () => {
      if (!user) {
        setTasks([]);
        setTrashedTasks([]);
        setAbandonedTasks([]);
        setTaskIdToTags({});
        setTagsCache({}); // 清空标签缓存
        setTrashedLoaded(false);
        setAbandonedLoaded(false);
        setTrashedLoading(false);
        setAbandonedLoading(false);
        setLoading(false);
        setHasLoaded(false);
        setSelectedTaskId(null);
        return;
      }

      // Skip if already loaded
      if (hasLoaded) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const data = await fetchTasks();

        setTasks(data);
        setTrashedTasks([]);
        setAbandonedTasks([]);
        setTrashedLoaded(false);
        setAbandonedLoaded(false);
        setTrashedLoading(false);
        setAbandonedLoading(false);

        setTagsCache({});

        const activeTaskIds = data.map(t => t.id);
        if (activeTaskIds.length > 0) {
          const mapping = await getTagsByTaskIdsService(activeTaskIds);
          setTaskIdToTags(mapping);
        } else {
          setTaskIdToTags({});
        }

        setHasLoaded(true);
        incrementTagsVersion(); // 更新标签版本
      } catch (error) {
        console.error("Failed to load tasks:", error);
        toast({
          title: "读取任务失败",
          description: "无法加载任务，请刷新页面重试",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadTasks();
  }, [toast, user, hasLoaded, setTasks, setTrashedTasks, setAbandonedTasks, setTaskIdToTags, setTagsCache, setTrashedLoaded, setAbandonedLoaded, setTrashedLoading, setAbandonedLoading, setLoading, setHasLoaded, incrementTagsVersion, setSelectedTaskId]);

  // Add task
  const addTask = useCallback(async (task: Omit<Task, "id">) => {
    try {
      if (!user) {
        toast({
          title: "添加失败",
          description: "您需要登录才能添加任务",
          variant: "destructive"
        });
        return;
      }

      // Ensure task has the current user's ID
      const taskWithUserId = {
        ...task,
        user_id: user.id
      };
      const tempId = `temp-${Date.now()}`;
      insertOptimisticTask({ tempId, ...taskWithUserId });

      try {
        const newTask = await addTaskService(taskWithUserId);
        if (!newTask) {
          throw new Error("add task failed");
        }

        replaceTaskById(tempId, newTask);
      } catch (error) {
        removeTask(tempId);
        throw error;
      }
    } catch (error) {
      console.error("Failed to add task:", error);
      throw error;
    }
  }, [user, toast, insertOptimisticTask, replaceTaskById, removeTask]);

  // Update task
  const updateTask = useCallback(async (id: string, updatedTask: Partial<Task>) => {
    if (!user) {
      toast({
        title: "更新失败",
        description: "您需要登录才能更新任务",
        variant: "destructive"
      });
      return;
    }

    const previousTasks = useTaskStore.getState().tasks;
    const updatedTasks = previousTasks.map((task) =>
      task.id === id ? { ...task, ...updatedTask } : task
    );
    setTasks(updatedTasks);

    try {
      const updated = await updateTaskService(id, updatedTask);
      if (!updated) {
        throw new Error("update task failed");
      }
    } catch (error) {
      setTasks(previousTasks);
      console.error("Failed to update task:", error);
      throw error;
    }
  }, [toast, user, setTasks]);

  const loadTrashedTasks = useCallback(async () => {
    if (!user) return;
    if (trashedLoaded || trashedLoading) return;

    setTrashedLoading(true);
    try {
      const data = await fetchDeletedTasks();
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
  }, [user, trashedLoaded, trashedLoading, toast, setTrashedLoading, setTrashedTasks, setTrashedLoaded]);

  const loadAbandonedTasks = useCallback(async () => {
    if (!user) return;
    if (abandonedLoaded || abandonedLoading) return;

    setAbandonedLoading(true);
    try {
      const data = await fetchAbandonedTasks();
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
  }, [user, abandonedLoaded, abandonedLoading, toast, setAbandonedLoading, setAbandonedTasks, setAbandonedLoaded]);

  // tags helpers
  const getTaskTags = useCallback((taskId: string): Tag[] => taskIdToTags[taskId] || [], [taskIdToTags]);

  const attachTagToTask = useCallback(async (taskId: string, tagId: string) => {
    const ok = await attachTagToTaskService(taskId, tagId);
    if (!ok) return;
    // refresh this task's tags
    const mapping = await getTagsByTaskIdsService([taskId]);
    const current = useTaskStore.getState().taskIdToTags;
    setTaskIdToTags({ ...current, ...mapping });
  }, [setTaskIdToTags]);

  const detachTagFromTask = useCallback(async (taskId: string, tagId: string) => {
    const ok = await detachTagFromTaskService(taskId, tagId);
    if (!ok) return;
    // refresh this task's tags
    const mapping = await getTagsByTaskIdsService([taskId]);
    const current = useTaskStore.getState().taskIdToTags;
    setTaskIdToTags({ ...current, ...mapping });
  }, [setTaskIdToTags]);

  const listAllTags = useCallback(async (projectId?: string | null) => {
    // If projectId is undefined, fetch ALL tags (for tag management UI)
    if (projectId === undefined) {
      return await fetchAllTagsService(undefined);
    }
    
    // If requesting a specific project's tags, get project-specific tags + global tags
    // This mirrors the behavior of getCachedTags
    if (projectId !== null) {
      const projectTags = await fetchAllTagsService(projectId);
      const globalTags = await fetchAllTagsService(null);
      return [...projectTags, ...globalTags];
    }
    
    // If explicitly requesting only global tags
    return await fetchAllTagsService(projectId);
  }, []);

  // 刷新所有标签缓存
  const refreshAllTags = useCallback(async () => {
    try {
      const allTags = await fetchAllTagsService(undefined);
      
      // 构建新的标签缓存 - 按项目分组
      const newTagsCache: Record<string, Tag[]> = {
        'global': allTags.filter(tag => tag.project_id === null)
      };
      
      // 为每个项目建立标签缓存
      allTags.forEach(tag => {
        if (tag.project_id) {
          if (!newTagsCache[tag.project_id]) {
            newTagsCache[tag.project_id] = [];
          }
          newTagsCache[tag.project_id].push(tag);
        }
      });
      
      const store = useTaskStore.getState();
      store.setTagsCache(newTagsCache);
      store.incrementTagsVersion();
      return true;
    } catch (error) {
      console.error("Failed to refresh tags:", error);
      return false;
    }
  }, []);

  // 修改createTag函数，更新后刷新缓存
  const createTag = useCallback(async (name: string, projectId?: string | null) => {
    const tag = await createTagService(name, projectId);
    // 更新缓存并 bump 版本（若创建成功）
    if (tag) {
      // 使用快速缓存更新
      const key = (projectId ?? null) === null ? 'global' : (projectId as string);
      const cache = useTaskStore.getState().tagsCache;
      const cur = cache[key] || [];
      if (!cur.some(t => t.id === tag.id)) {
        const store = useTaskStore.getState();
        store.setTagsCache({ ...cache, [key]: [tag, ...cur] });
        store.incrementTagsVersion();
      }
    }
    return tag;
  }, []);

  // 修改deleteTagPermanently函数
  const deleteTagPermanently = useCallback(async (tagId: string): Promise<boolean> => {
    const ok = await deleteTagByIdService(tagId);
    if (ok) {
      // 从缓存中移除并 bump 版本
      const cache = useTaskStore.getState().tagsCache;
      const nextCache: Record<string, Tag[]> = {};
      Object.keys(cache).forEach(k => {
        nextCache[k] = (cache[k] || []).filter(t => t.id !== tagId);
      });
      const store = useTaskStore.getState();
      store.setTagsCache(nextCache);
      // 从任务-标签映射中移除该标签
      const mapping = useTaskStore.getState().taskIdToTags;
      const mappingNext: Record<string, Tag[]> = {};
      Object.keys(mapping).forEach(taskId => {
        mappingNext[taskId] = (mapping[taskId] || []).filter(t => t.id !== tagId);
      });
      store.setTaskIdToTags(mappingNext);
      store.incrementTagsVersion();
    }
    return ok;
  }, []);

  // 修改updateTagProject函数
  const updateTagProject = useCallback(async (tagId: string, projectId: string | null): Promise<Tag | null> => {
    const updatedTag = await updateTagProjectService(tagId, projectId);
    if (updatedTag) {
      // 刷新标签缓存
      const cache = useTaskStore.getState().tagsCache;
      const next = { ...cache };
      Object.keys(next).forEach(key => {
        next[key] = (next[key] || []).filter(t => t.id !== tagId);
      });
      const targetKey = projectId === null ? 'global' : projectId;
      const targetList = next[targetKey] || [];
      next[targetKey] = [updatedTag, ...targetList];
      const store = useTaskStore.getState();
      store.setTagsCache(next);
      store.incrementTagsVersion();
    }
    return updatedTag;
  }, []);

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
  const keyForProject = (projectId?: string | null): string => {
    return (projectId ?? null) === null ? 'global' : projectId as string;
  };

  const getCachedTags = useCallback((projectId?: string | null): Tag[] => {
    // 获取项目特定的标签
    const key = keyForProject(projectId);
    const projectSpecificTags = tagsCache[key] || [];
    
    // 如果请求的是特定项目的标签，还需要包括全局标签
    if (projectId !== null && projectId !== undefined) {
      const globalTags = tagsCache['global'] || [];
      return [...projectSpecificTags, ...globalTags];
    }
    
    return projectSpecificTags;
  }, [tagsCache]);

  // 优化 ensureTagsLoaded 函数，先从缓存获取，必要时再加载
  const ensureTagsLoaded = useCallback(async (projectId?: string | null) => {
    // Generate cache key for the requested scope
    const key = keyForProject(projectId);
    
    // Skip if we already have tags for this scope
    const cacheSnapshot = useTaskStore.getState().tagsCache;
    if (cacheSnapshot[key] && cacheSnapshot[key].length > 0) return;
    
    // 由于我们在初始化时已经预加载了所有标签，这里只需要在缓存缺失的情况下重新加载
    // For projects, also ensure we have global tags cached
    if (projectId !== null && projectId !== undefined) {
      const globalKey = 'global';
      if (!cacheSnapshot[globalKey] || cacheSnapshot[globalKey].length === 0) {
        const globalData = await fetchAllTagsService(null);
        const store = useTaskStore.getState();
        store.setTagsCache({ ...cacheSnapshot, [globalKey]: globalData });
        store.incrementTagsVersion();
      }
    }
    
    // 只有在缓存中没有对应项目的标签时才加载
    const data = await fetchAllTagsService(projectId);
    const store = useTaskStore.getState();
    store.setTagsCache({ ...store.tagsCache, [key]: data });
    store.incrementTagsVersion();
  }, []);

  // Move task to trash (soft delete)
  const moveToTrash = useCallback(async (id: string) => {
    try {
      if (!user) {
        toast({
          title: "删除失败",
          description: "您需要登录才能删除任务",
          variant: "destructive"
        });
        return;
      }

      const success = await moveToTrashService(id);
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
    } catch (error) {
      console.error("Failed to move task to trash:", error);
      throw error;
    }
  }, [user, toast, selectedTaskId, setTasks, setTrashedTasks, setSelectedTaskId]);

  // Restore task from trash
  const restoreFromTrash = useCallback(async (id: string) => {
    try {
      if (!user) {
        toast({
          title: "恢复失败",
          description: "您需要登录才能恢复任务",
          variant: "destructive"
        });
        return;
      }

      const success = await restoreFromTrashService(id);
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
    } catch (error) {
      console.error("Failed to restore task from trash:", error);
      throw error;
    }
  }, [user, toast, setTrashedTasks, setTasks]);

  // Permanently delete task
  const deleteTask = useCallback(async (id: string) => {
    try {
      if (!user) {
        toast({
          title: "删除失败",
          description: "您需要登录才能删除任务",
          variant: "destructive"
        });
        return;
      }

      const success = await deleteTaskService(id);
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
    } catch (error) {
      console.error("Failed to permanently delete task:", error);
      throw error;
    }
  }, [user, toast, selectedTaskId, setTrashedTasks, setTasks, setSelectedTaskId]);

  useEffect(() => {
    if (!user) return;
    if (selectedProject === "trash") {
      loadTrashedTasks();
    } else if (selectedProject === "abandoned") {
      loadAbandonedTasks();
    }
  }, [selectedProject, user, loadTrashedTasks, loadAbandonedTasks]);

  const selectTask = useCallback((id: string | null) => {
    setSelectedTaskId(id);
  }, [setSelectedTaskId]);

  const selectProject = useCallback((id: string) => {
    // Save the selected project to localStorage
    localStorage.setItem(SELECTED_PROJECT_KEY, id);
    setSelectedProject(id);
  }, [setSelectedProject]);

  // Reorder tasks
  const reorderTasks = useCallback(async (projectId: string, sourceIndex: number, destinationIndex: number, isCompletedArea = false) => {
    // If source and destination are the same, no need to reorder
    if (sourceIndex === destinationIndex) return;

    // Get only tasks for the specific project based on completion status
    const currentTasks = useTaskStore.getState().tasks;
    const projectTasks = currentTasks.filter(task =>
      task.project === projectId && task.completed === isCompletedArea
    );

    // Create a copy of the array
    const reorderedProjectTasks = [...projectTasks];

    // Remove the task from the source position and insert at destination
    const [removed] = reorderedProjectTasks.splice(sourceIndex, 1);
    reorderedProjectTasks.splice(destinationIndex, 0, removed);

    // Assign new sort_order values to the reordered tasks (1000 between each task)
    const updatedTasks = reorderedProjectTasks.map((task, index) => ({
      ...task,
      sort_order: (index + 1) * 1000
    }));

    // Update the tasks state with the new order
    const otherTasks = currentTasks.filter(task =>
      !(task.project === projectId && task.completed === isCompletedArea)
    );
    setTasks([...updatedTasks, ...otherTasks]);

    // Update the order in Supabase
    try {
      // Update each task's sort_order in the database
      for (const task of updatedTasks) {
        await updateTaskService(task.id, { sort_order: task.sort_order });
      }
    } catch (error) {
      console.error('Failed to update task order in database:', error);
      toast({
        title: "排序保存失败",
        description: "任务顺序已在本地更新，但未能保存到服务器",
        variant: "destructive"
      });
    }
  }, [toast, setTasks]);

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
      if (!user) {
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
    } catch (error) {
      console.error("Failed to abandon task:", error);
      throw error;
    }
  }, [user, toast, selectedTaskId, setTasks, setAbandonedTasks, setSelectedTaskId]);

  // Restore task from abandoned
  const restoreAbandonedTask = useCallback(async (id: string) => {
    try {
      if (!user) {
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
    } catch (error) {
      console.error("Failed to restore abandoned task:", error);
      throw error;
    }
  }, [user, toast, setAbandonedTasks, setTasks]);

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
  ]);

  return (
    <TaskContext.Provider value={contextValue}>
      {children}
    </TaskContext.Provider>
  );
};
