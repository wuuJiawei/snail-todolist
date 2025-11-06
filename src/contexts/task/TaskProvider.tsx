
import React, { useState, ReactNode, useEffect, useMemo, useCallback, useRef } from "react";
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

interface TaskProviderProps {
  children: ReactNode;
}

export const TaskProvider: React.FC<TaskProviderProps> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [trashedTasks, setTrashedTasks] = useState<Task[]>([]);
  const [abandonedTasks, setAbandonedTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [trashedLoading, setTrashedLoading] = useState<boolean>(false);
  const [abandonedLoading, setAbandonedLoading] = useState<boolean>(false);
  const [trashedLoaded, setTrashedLoaded] = useState<boolean>(false);
  const [abandonedLoaded, setAbandonedLoaded] = useState<boolean>(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string>(getSavedProject());
  const [hasLoaded, setHasLoaded] = useState<boolean>(false);
  const [taskIdToTags, setTaskIdToTags] = useState<Record<string, Tag[]>>({});
  const [tagsCache, setTagsCache] = useState<Record<string, Tag[]>>({});
  const [tagsVersion, setTagsVersion] = useState<number>(0);

  const { toast } = useToast();
  const { user } = useAuth();

  const tasksRef = useRef<Task[]>([]);
  const trashedTasksRef = useRef<Task[]>([]);
  const abandonedTasksRef = useRef<Task[]>([]);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    trashedTasksRef.current = trashedTasks;
  }, [trashedTasks]);

  useEffect(() => {
    abandonedTasksRef.current = abandonedTasks;
  }, [abandonedTasks]);

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
  }, [selectedTaskId, selectedTask]);
  
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
        setTagsVersion(v => v + 1); // 更新标签版本
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
  }, [toast, user]);

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
      const optimisticTask: Task = {
        id: tempId,
        title: taskWithUserId.title,
        completed: taskWithUserId.completed ?? false,
        date: taskWithUserId.date,
        project: taskWithUserId.project,
        description: taskWithUserId.description,
        icon: taskWithUserId.icon,
        attachments: taskWithUserId.attachments ?? [],
        user_id: user.id,
        sort_order: taskWithUserId.sort_order,
        deleted: false,
        abandoned: false,
      };

      setTasks((prev) => [optimisticTask, ...prev]);

      try {
        const newTask = await addTaskService(taskWithUserId);
        if (!newTask) {
          throw new Error("add task failed");
        }

        setTasks((prev) =>
          prev.map((existing) => (existing.id === tempId ? newTask : existing))
        );
      } catch (error) {
        setTasks((prev) => prev.filter((existing) => existing.id !== tempId));
        throw error;
      }
    } catch (error) {
      console.error("Failed to add task:", error);
      throw error;
    }
  }, [user, toast]);

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

    const previousTasks = tasksRef.current;
    setTasks((prev) =>
      prev.map((task) => (task.id === id ? { ...task, ...updatedTask } : task))
    );

    try {
      const updated = await updateTaskService(id, updatedTask);
      if (!updated) {
        throw new Error("update task failed");
      }
    } catch (error) {
      setTasks(previousTasks);
      tasksRef.current = previousTasks;
      console.error("Failed to update task:", error);
      throw error;
    }
  }, [toast, user]);

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
  }, [user, trashedLoaded, trashedLoading, toast]);

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
  }, [user, abandonedLoaded, abandonedLoading, toast]);

  // tags helpers
  const getTaskTags = useCallback((taskId: string): Tag[] => taskIdToTags[taskId] || [], [taskIdToTags]);

  const attachTagToTask = useCallback(async (taskId: string, tagId: string) => {
    const ok = await attachTagToTaskService(taskId, tagId);
    if (!ok) return;
    // refresh this task's tags
    const mapping = await getTagsByTaskIdsService([taskId]);
    setTaskIdToTags(prev => ({ ...prev, ...mapping }));
  }, []);

  const detachTagFromTask = useCallback(async (taskId: string, tagId: string) => {
    const ok = await detachTagFromTaskService(taskId, tagId);
    if (!ok) return;
    // refresh this task's tags
    const mapping = await getTagsByTaskIdsService([taskId]);
    setTaskIdToTags(prev => ({ ...prev, ...mapping }));
  }, []);

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
      
      setTagsCache(newTagsCache);
      setTagsVersion(v => v + 1);
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
      setTagsCache(prev => {
        const cur = prev[key] || [];
        // 去重
        if (cur.some(t => t.id === tag.id)) return prev;
        return { ...prev, [key]: [tag, ...cur] };
      });
      setTagsVersion(v => v + 1);
    }
    return tag;
  }, []);

  // 修改deleteTagPermanently函数
  const deleteTagPermanently = useCallback(async (tagId: string): Promise<boolean> => {
    const ok = await deleteTagByIdService(tagId);
    if (ok) {
      // 从缓存中移除并 bump 版本
      setTagsCache(prev => {
        const next: Record<string, Tag[]> = {};
        Object.keys(prev).forEach(k => {
          next[k] = (prev[k] || []).filter(t => t.id !== tagId);
        });
        return next;
      });
      // 从任务-标签映射中移除该标签
      setTaskIdToTags(prev => {
        const next: Record<string, Tag[]> = {};
        Object.keys(prev).forEach(taskId => {
          next[taskId] = (prev[taskId] || []).filter(t => t.id !== tagId);
        });
        return next;
      });
      setTagsVersion(v => v + 1);
    }
    return ok;
  }, []);

  // 修改updateTagProject函数
  const updateTagProject = useCallback(async (tagId: string, projectId: string | null): Promise<Tag | null> => {
    const updatedTag = await updateTagProjectService(tagId, projectId);
    if (updatedTag) {
      // 刷新标签缓存
      setTagsCache(prev => {
        const next = { ...prev };
        // 从所有项目缓存中移除这个标签
        Object.keys(next).forEach(key => {
          next[key] = (next[key] || []).filter(t => t.id !== tagId);
        });
        
        // 添加到正确的项目缓存中
        const targetKey = projectId === null ? 'global' : projectId;
        if (!next[targetKey]) next[targetKey] = [];
        next[targetKey] = [updatedTag, ...next[targetKey]];
        
        return next;
      });
      setTagsVersion(v => v + 1);
    }
    return updatedTag;
  }, []);

  const getAllTagUsageCounts = useCallback(() => {
    const counts: Record<string, number> = {};
    // 只统计待办状态的任务（未完成且未放弃的任务）
    const pendingTasks = tasksRef.current.filter(task => !task.completed && !task.abandoned);
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
    if (tagsCache[key] && tagsCache[key].length > 0) return;
    
    // 由于我们在初始化时已经预加载了所有标签，这里只需要在缓存缺失的情况下重新加载
    // For projects, also ensure we have global tags cached
    if (projectId !== null && projectId !== undefined) {
      const globalKey = 'global';
      if (!tagsCache[globalKey] || tagsCache[globalKey].length === 0) {
        const globalData = await fetchAllTagsService(null);
        setTagsCache(prev => ({ ...prev, [globalKey]: globalData }));
      }
    }
    
    // 只有在缓存中没有对应项目的标签时才加载
    const data = await fetchAllTagsService(projectId);
    setTagsCache(prev => ({ ...prev, [key]: data }));
    setTagsVersion(v => v + 1);
  }, [tagsCache]);

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

      // Find the task before removing it from the tasks list
      const taskToTrash = tasksRef.current.find(task => task.id === id);

      // Remove from regular tasks
      setTasks((prev) => prev.filter((task) => task.id !== id));

      // Add to trashed tasks if found
      if (taskToTrash) {
        const trashedTask = {
          ...taskToTrash,
          deleted: true,
          deleted_at: new Date().toISOString()
        };
        setTrashedTasks(prev => [trashedTask, ...prev]);
      }

      // Clear selection if the trashed task was selected
      if (selectedTaskId === id) {
        setSelectedTaskId(null);
      }
    } catch (error) {
      console.error("Failed to move task to trash:", error);
      throw error;
    }
  }, [user, toast, selectedTaskId]);

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
      const taskToRestore = trashedTasksRef.current.find(task => task.id === id);

      // Remove from trashed tasks
      setTrashedTasks((prev) => prev.filter((task) => task.id !== id));

      // Add to regular tasks if found
      if (taskToRestore) {
        const restoredTask = {
          ...taskToRestore,
          deleted: false,
          deleted_at: undefined
        };
        setTasks(prev => [restoredTask, ...prev]);
      }
    } catch (error) {
      console.error("Failed to restore task from trash:", error);
      throw error;
    }
  }, [user, toast]);

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
      setTrashedTasks((prev) => prev.filter((task) => task.id !== id));

      // Also ensure it's removed from regular tasks (just in case)
      setTasks((prev) => prev.filter((task) => task.id !== id));

      if (selectedTaskId === id) {
        setSelectedTaskId(null);
      }
    } catch (error) {
      console.error("Failed to permanently delete task:", error);
      throw error;
    }
  }, [user, toast, selectedTaskId]);

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
  }, []);

  const selectProject = useCallback((id: string) => {
    // Save the selected project to localStorage
    localStorage.setItem(SELECTED_PROJECT_KEY, id);
    setSelectedProject(id);
  }, []);

  // Reorder tasks
  const reorderTasks = useCallback(async (projectId: string, sourceIndex: number, destinationIndex: number, isCompletedArea = false) => {
    // If source and destination are the same, no need to reorder
    if (sourceIndex === destinationIndex) return;

    // Get only tasks for the specific project based on completion status
    const projectTasks = tasksRef.current.filter(task =>
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
    setTasks(prev => {
      // First filter out the tasks that were reordered
      const otherTasks = prev.filter(task =>
        !(task.project === projectId && task.completed === isCompletedArea)
      );
      // Then add the reordered tasks back
      return [...updatedTasks, ...otherTasks];
    });

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
  }, [toast]);

  // Calculate project counts that will be used by both contexts
  const calculateProjectCounts = () => {
    // Create a map to store task counts by project ID
    const projectCounts: Record<string, number> = {};

    // Count tasks for each project
    tasks.forEach(task => {
      if (task.project && !task.completed) {
        projectCounts[task.project] = (projectCounts[task.project] || 0) + 1;
      }
    });

    return projectCounts;
  };

  // Update project counts in ProjectContext whenever tasks change
  useEffect(() => {
    // Get project counts for custom projects
    const projectCounts = calculateProjectCounts();

    // Find any custom hook or function that might be subscribing to this data
    const event = new CustomEvent('task-counts-updated', {
      detail: { projectCounts }
    });
    window.dispatchEvent(event);
  }, [tasks]);

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
      const taskToAbandon = tasksRef.current.find(task => task.id === id);

      // Remove from regular tasks
      setTasks((prev) => prev.filter((task) => task.id !== id));

      // Add to abandoned tasks if found
      if (taskToAbandon) {
        const abandonedTask = {
          ...taskToAbandon,
          abandoned: true,
          abandoned_at: new Date().toISOString(),
          completed: false,
          completed_at: undefined
        };
        setAbandonedTasks(prev => [abandonedTask, ...prev]);
      }

      // Clear selection if the abandoned task was selected
      if (selectedTaskId === id) {
        setSelectedTaskId(null);
      }
    } catch (error) {
      console.error("Failed to abandon task:", error);
      throw error;
    }
  }, [user, toast, selectedTaskId]);

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
      const taskToRestore = abandonedTasksRef.current.find(task => task.id === id);

      // Remove from abandoned tasks
      setAbandonedTasks((prev) => prev.filter((task) => task.id !== id));

      // Add to regular tasks if found
      if (taskToRestore) {
        const restoredTask = {
          ...taskToRestore,
          abandoned: false,
          abandoned_at: undefined
        };
        setTasks(prev => [restoredTask, ...prev]);
      }
    } catch (error) {
      console.error("Failed to restore abandoned task:", error);
      throw error;
    }
  }, [user, toast]);

  // Get the count of tasks in trash
  const getTrashCount = useCallback(() => {
    return trashedTasksRef.current.length;
  }, []);

  // Get the count of abandoned tasks
  const getAbandonedCount = useCallback(() => {
    return abandonedTasksRef.current.length;
  }, []);

  const getProjectTaskCountForProject = useCallback((projectId: string) => {
    return getProjectTaskCount(tasksRef.current, projectId);
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
