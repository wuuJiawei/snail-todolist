
import React, { useState, ReactNode, useEffect } from "react";
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
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedProject, setSelectedProject] = useState<string>(getSavedProject());
  const [hasLoaded, setHasLoaded] = useState<boolean>(false);
  const [taskIdToTags, setTaskIdToTags] = useState<Record<string, Tag[]>>({});
  const [tagsCache, setTagsCache] = useState<Record<string, Tag[]>>({});
  const [tagsVersion, setTagsVersion] = useState<number>(0);

  const { toast } = useToast();
  const { user } = useAuth();
  
  // Enable deadline notifications for all tasks
  useDeadlineNotifications({ 
    tasks, 
    enabled: true 
  });

  // Load tasks from Supabase on mount or when user changes
  useEffect(() => {
    const loadTasks = async () => {
      if (!user) {
        setTasks([]);
        setTrashedTasks([]);
        setAbandonedTasks([]);
        setTaskIdToTags({});
        setLoading(false);
        setHasLoaded(false);
        return;
      }

      // Skip if already loaded
      if (hasLoaded) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Load regular tasks (not deleted)
        const data = await fetchTasks();
        setTasks(data);

        // Load trashed tasks
        const trashedData = await fetchDeletedTasks();
        setTrashedTasks(trashedData);

        // Load abandoned tasks
        const abandonedData = await fetchAbandonedTasks();
        setAbandonedTasks(abandonedData);

        // Load tags mapping for fetched tasks
        const allTaskIds = [...data.map(t => t.id), ...trashedData.map(t => t.id), ...abandonedData.map(t => t.id)];
        const mapping = await getTagsByTaskIdsService(allTaskIds);
        setTaskIdToTags(mapping);

        setHasLoaded(true);
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
  const addTask = async (task: Omit<Task, "id">) => {
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

      const newTask = await addTaskService(taskWithUserId);
      if (newTask) {
        setTasks((prev) => [newTask, ...prev]);
      }
    } catch (error) {
      console.error("Failed to add task:", error);
    }
  };

  // Update task
  const updateTask = async (id: string, updatedTask: Partial<Task>) => {
    try {
      if (!user) {
        toast({
          title: "更新失败",
          description: "您需要登录才能更新任务",
          variant: "destructive"
        });
        return;
      }

      const updated = await updateTaskService(id, updatedTask);
      if (updated) {
        setTasks((prev) =>
          prev.map((task) => (task.id === id ? { ...task, ...updatedTask } : task))
        );

        // Update selected task if it's the one being updated
        if (selectedTask?.id === id) {
          setSelectedTask((prev) => (prev ? { ...prev, ...updatedTask } : null));
        }
      }
    } catch (error) {
      console.error("Failed to update task:", error);
    }
  };

  // tags helpers
  const getTaskTags = (taskId: string): Tag[] => taskIdToTags[taskId] || [];

  const attachTagToTask = async (taskId: string, tagId: string) => {
    const ok = await attachTagToTaskService(taskId, tagId);
    if (!ok) return;
    // refresh this task's tags
    const mapping = await getTagsByTaskIdsService([taskId]);
    setTaskIdToTags(prev => ({ ...prev, ...mapping }));
  };

  const detachTagFromTask = async (taskId: string, tagId: string) => {
    const ok = await detachTagFromTaskService(taskId, tagId);
    if (!ok) return;
    // refresh this task's tags
    const mapping = await getTagsByTaskIdsService([taskId]);
    setTaskIdToTags(prev => ({ ...prev, ...mapping }));
  };

  const listAllTags = async (projectId?: string | null) => {
    return await fetchAllTagsService(projectId);
  };

  const createTag = async (name: string, projectId?: string | null) => {
    const tag = await createTagService(name, projectId);
    // 更新缓存并 bump 版本（若创建成功）
    if (tag) {
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
  };

  const deleteTagPermanently = async (tagId: string): Promise<boolean> => {
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
  };

  const updateTagProject = async (tagId: string, projectId: string | null): Promise<Tag | null> => {
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
  };

  const getAllTagUsageCounts = () => {
    const counts: Record<string, number> = {};
    Object.values(taskIdToTags).forEach(tags => {
      (tags || []).forEach(tag => {
        counts[tag.id] = (counts[tag.id] || 0) + 1;
      });
    });
    return counts;
  };

  // 全局标签：不再区分 projectId，统一使用 'global' 作为缓存键
  const keyForProject = (_projectId?: string | null) => 'global';

  const getCachedTags = (projectId?: string | null): Tag[] => {
    const key = keyForProject(projectId);
    return tagsCache[key] || [];
  };

  const ensureTagsLoaded = async (projectId?: string | null) => {
    const key = keyForProject(projectId);
    if (tagsCache[key] && tagsCache[key].length > 0) return; // 已有缓存
    const data = await fetchAllTagsService(projectId);
    setTagsCache(prev => ({ ...prev, [key]: data }));
    setTagsVersion(v => v + 1);
  };

  // Move task to trash (soft delete)
  const moveToTrash = async (id: string) => {
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
      if (success) {
        // Find the task before removing it from the tasks list
        const taskToTrash = tasks.find(task => task.id === id);

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
        if (selectedTask?.id === id) {
          setSelectedTask(null);
        }
      }
    } catch (error) {
      console.error("Failed to move task to trash:", error);
    }
  };

  // Restore task from trash
  const restoreFromTrash = async (id: string) => {
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
      if (success) {
        // Find the task before removing it from the trashed tasks list
        const taskToRestore = trashedTasks.find(task => task.id === id);

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
      }
    } catch (error) {
      console.error("Failed to restore task from trash:", error);
    }
  };

  // Permanently delete task
  const deleteTask = async (id: string) => {
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
      if (success) {
        // Remove from trashed tasks
        setTrashedTasks((prev) => prev.filter((task) => task.id !== id));

        // Also ensure it's removed from regular tasks (just in case)
        setTasks((prev) => prev.filter((task) => task.id !== id));

        if (selectedTask?.id === id) {
          setSelectedTask(null);
        }
      }
    } catch (error) {
      console.error("Failed to permanently delete task:", error);
    }
  };

  const selectTask = (id: string | null) => {
    if (id === null) {
      setSelectedTask(null);
    } else {
      const task = tasks.find((t) => t.id === id) || null;
      setSelectedTask(task);
    }
  };

  const selectProject = (id: string) => {
    // Save the selected project to localStorage
    localStorage.setItem(SELECTED_PROJECT_KEY, id);
    setSelectedProject(id);
  };

  // Reorder tasks
  const reorderTasks = async (projectId: string, sourceIndex: number, destinationIndex: number, isCompletedArea = false) => {
    // If source and destination are the same, no need to reorder
    if (sourceIndex === destinationIndex) return;

    // Get only tasks for the specific project based on completion status
    const projectTasks = tasks.filter(task =>
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
  };

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
  const abandonTask = async (id: string) => {
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
      if (success) {
        // Find the task before removing it from the tasks list
        const taskToAbandon = tasks.find(task => task.id === id);

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
        if (selectedTask?.id === id) {
          setSelectedTask(null);
        }
      }
    } catch (error) {
      console.error("Failed to abandon task:", error);
    }
  };

  // Restore task from abandoned
  const restoreAbandonedTask = async (id: string) => {
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
      if (success) {
        // Find the task before removing it from the abandoned tasks list
        const taskToRestore = abandonedTasks.find(task => task.id === id);

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
      }
    } catch (error) {
      console.error("Failed to restore abandoned task:", error);
    }
  };

  // Get the count of tasks in trash
  const getTrashCount = () => {
    return trashedTasks.length;
  };

  // Get the count of abandoned tasks
  const getAbandonedCount = () => {
    return abandonedTasks.length;
  };

  return (
    <TaskContext.Provider
      value={{
        tasks,
        trashedTasks,
        abandonedTasks,
        loading,
        selectedTask,
        selectedProject,
        addTask,
        updateTask,
        moveToTrash,
        restoreFromTrash,
        deleteTask,
        abandonTask,
        restoreAbandonedTask,
        selectTask,
        selectProject,
        reorderTasks,
        getProjectTaskCount: (projectId: string) => getProjectTaskCount(tasks, projectId),
        getTrashCount,
        getAbandonedCount,
        getTaskTags,
        attachTagToTask,
        detachTagFromTask,
        listAllTags,
        createTag,
        deleteTagPermanently,
        updateTagProject,
        getAllTagUsageCounts,
        getCachedTags,
        ensureTagsLoaded,
        tagsVersion,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
};
