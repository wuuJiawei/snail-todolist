import { supabase } from "@/integrations/supabase/client";
import { Task } from "@/types/task";
import { toast } from "@/hooks/use-toast";

// Fetch all tasks for the current user (excluding deleted tasks by default)
export const fetchTasks = async (includeDeleted: boolean = false): Promise<Task[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast({
        title: "未登录",
        description: "请先登录后再查看任务",
        variant: "destructive",
      });
      return [];
    }

    // First, get all projects the user is a member of
    const { data: memberProjects, error: memberError } = await supabase
      .from('project_members')
      .select('project_id')
      .eq('user_id', user.id);

    if (memberError) {
      throw memberError;
    }

    // Extract project IDs
    const memberProjectIds = memberProjects.map(mp => mp.project_id);

    // Build the query for tasks
    let query = supabase.from("tasks").select("*");

    // If there are member projects, include them in the query
    if (memberProjectIds.length > 0) {
      query = query.or(`user_id.eq.${user.id},project.in.(${memberProjectIds.join(',')})`);
    } else {
      query = query.eq("user_id", user.id);
    }

    // Only include non-deleted and non-abandoned tasks unless specifically requested
    if (!includeDeleted) {
      query = query.eq("deleted", false).eq("abandoned", false);
    }

    const { data, error } = await query
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    // Ensure we properly map the data to our Task type
    return (data || []).map((item): Task => ({
      id: item.id,
      title: item.title,
      completed: item.completed,
      date: item.date || undefined,
      project: item.project || undefined,
      description: item.description || undefined,
      icon: item.icon || undefined,
      completed_at: item.completed_at || undefined,
      updated_at: item.updated_at || undefined,
      user_id: item.user_id || undefined,
      sort_order: item.sort_order !== null ? item.sort_order : undefined,
      deleted: item.deleted || false,
      deleted_at: item.deleted_at || undefined,
      abandoned: item.abandoned || false,
      abandoned_at: item.abandoned_at || undefined,
      attachments: (() => {
        try {
          return item.attachments && typeof item.attachments === 'string' 
            ? JSON.parse(item.attachments) 
            : (item.attachments || []);
        } catch (e) {
          console.warn('Failed to parse attachments:', e);
          return [];
        }
      })(),
    }));
  } catch (error) {
    console.error("Error fetching tasks:", error);
    toast({
      title: "读取任务失败",
      description: "无法获取任务列表，请稍后再试",
      variant: "destructive",
    });
    return [];
  }
};

// Fetch only deleted tasks (trash)
export const fetchDeletedTasks = async (): Promise<Task[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast({
        title: "未登录",
        description: "请先登录后再查看垃圾桶",
        variant: "destructive",
      });
      return [];
    }

    // First, get all projects the user is a member of
    const { data: memberProjects, error: memberError } = await supabase
      .from('project_members')
      .select('project_id')
      .eq('user_id', user.id);

    if (memberError) {
      throw memberError;
    }

    // Extract project IDs
    const memberProjectIds = memberProjects.map(mp => mp.project_id);

    // Build the query for deleted tasks
    let query = supabase.from("tasks").select("*");

    // If there are member projects, include them in the query
    if (memberProjectIds.length > 0) {
      query = query.or(`user_id.eq.${user.id},project.in.(${memberProjectIds.join(',')})`);
    } else {
      query = query.eq("user_id", user.id);
    }

    // Add filters for deleted tasks (only deleted, not abandoned tasks)
    query = query.eq("deleted", true).eq("abandoned", false).order("deleted_at", { ascending: false }); // Most recently deleted first

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    // Ensure we properly map the data to our Task type
    return (data || []).map((item): Task => ({
      id: item.id,
      title: item.title,
      completed: item.completed,
      date: item.date || undefined,
      project: item.project || undefined,
      description: item.description || undefined,
      icon: item.icon || undefined,
      completed_at: item.completed_at || undefined,
      updated_at: item.updated_at || undefined,
      user_id: item.user_id || undefined,
      sort_order: item.sort_order !== null ? item.sort_order : undefined,
      deleted: item.deleted || false,
      deleted_at: item.deleted_at || undefined,
      abandoned: item.abandoned || false,
      abandoned_at: item.abandoned_at || undefined,
      attachments: (() => {
        try {
          return item.attachments && typeof item.attachments === 'string' 
            ? JSON.parse(item.attachments) 
            : (item.attachments || []);
        } catch (e) {
          console.warn('Failed to parse attachments:', e);
          return [];
        }
      })(),
    }));
  } catch (error) {
    console.error("Error fetching deleted tasks:", error);
    toast({
      title: "读取垃圾桶失败",
      description: "无法获取垃圾桶任务列表，请稍后再试",
      variant: "destructive",
    });
    return [];
  }
};

// Add a new task
export const addTask = async (task: Omit<Task, "id">): Promise<Task | null> => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast({
        title: "未登录",
        description: "请先登录后再添加任务",
        variant: "destructive",
      });
      return null;
    }

    // If this is a shared project, check if the user is a member
    if (task.project) {
      const { data: memberData, error: memberError } = await supabase
        .from('project_members')
        .select('id')
        .eq('project_id', task.project)
        .eq('user_id', user.id)
        .maybeSingle();

      if (memberError) {
        console.error("Error checking project membership:", memberError);
      }

      // If the user is not a member and not the creator, they can't add tasks
      if (!memberData) {
        // Check if the user is the creator of the project
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('user_id')
          .eq('id', task.project)
          .maybeSingle();

        if (projectError) {
          console.error("Error checking project ownership:", projectError);
        }

        if (!projectData || projectData.user_id !== user.id) {
          toast({
            title: "添加失败",
            description: "您没有权限在此清单中添加任务",
            variant: "destructive",
          });
          return null;
        }
      }
    }

    // Get the highest sort_order for the project
    const { data: maxOrderData, error: maxOrderError } = await supabase
      .from("tasks")
      .select("sort_order")
      .eq("project", task.project)
      .eq("completed", task.completed)
      .order("sort_order", { ascending: false })
      .limit(1);

    if (maxOrderError) {
      console.error("Error getting max sort order:", maxOrderError);
    }

    // Calculate the next sort order (1000 higher than the current max)
    const maxOrder = maxOrderData && maxOrderData.length > 0 && maxOrderData[0].sort_order !== null
      ? maxOrderData[0].sort_order
      : 0;
    const nextSortOrder = maxOrder + 1000;

    // Add user_id and sort_order to task
    const taskWithUserId = {
      ...task,
      user_id: user.id,
      sort_order: nextSortOrder,
      // Convert attachments array to JSON string for storage
      attachments: task.attachments ? JSON.stringify(task.attachments) : '[]'
    };

    const { data, error } = await supabase
      .from("tasks")
      .insert(taskWithUserId)
      .select();

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      throw new Error("No data returned after insert");
    }

    toast({
      title: "添加成功",
      description: "任务已成功添加",
    });

    return {
      id: data[0].id,
      title: data[0].title,
      completed: data[0].completed,
      date: data[0].date || undefined,
      project: data[0].project || undefined,
      description: data[0].description || undefined,
      icon: data[0].icon || undefined,
      completed_at: data[0].completed_at || undefined,
      updated_at: data[0].updated_at || undefined,
      user_id: data[0].user_id || undefined,
      sort_order: data[0].sort_order !== null ? data[0].sort_order : undefined,
      deleted: data[0].deleted || false,
      deleted_at: data[0].deleted_at || undefined,
      abandoned: data[0].abandoned || false,
      abandoned_at: data[0].abandoned_at || undefined,
      attachments: (() => {
        try {
          return data[0].attachments && typeof data[0].attachments === 'string'
            ? JSON.parse(data[0].attachments)
            : (data[0].attachments || []);
        } catch (e) {
          console.warn('Failed to parse attachments:', e);
          return [];
        }
      })(),
    };
  } catch (error) {
    console.error("Error adding task:", error);
    toast({
      title: "添加失败",
      description: "无法添加任务，请稍后再试",
      variant: "destructive",
    });
    return null;
  }
};

// Update an existing task
export const updateTask = async (
  id: string,
  updates: Partial<Task>
): Promise<Task | null> => {
  try {
    // Get current user to verify ownership
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast({
        title: "未登录",
        description: "请先登录后再更新任务",
        variant: "destructive",
      });
      return null;
    }

    // First, get the task to check if it's in a shared project
    const { data: taskData, error: taskError } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", id)
      .single();

    if (taskError) {
      throw taskError;
    }

    // Check if the user has permission to update this task
    let hasPermission = taskData.user_id === user.id; // User is the creator

    // If not the creator and task is in a project, check if user is a member of the project
    if (!hasPermission && taskData.project) {
      const { data: memberData, error: memberError } = await supabase
        .from('project_members')
        .select('id')
        .eq('project_id', taskData.project)
        .eq('user_id', user.id)
        .maybeSingle();

      if (memberError) {
        console.error("Error checking project membership:", memberError);
      }

      hasPermission = !!memberData; // User is a member of the project
    }

    if (!hasPermission) {
      toast({
        title: "更新失败",
        description: "您没有权限更新此任务",
        variant: "destructive",
      });
      return null;
    }

    // If task is being marked as completed, set the completed_at timestamp
    if (updates.completed === true) {
      updates.completed_at = new Date().toISOString();
    }
    // If task is being marked as incomplete, remove the completed_at timestamp
    else if (updates.completed === false) {
      updates.completed_at = null;
    }

    // Prepare updates for database - convert attachments array to JSON string for storage
    const dbUpdates = { ...updates };
    if (dbUpdates.attachments !== undefined) {
      dbUpdates.attachments = JSON.stringify(dbUpdates.attachments || []);
    }

    const { data, error } = await supabase
      .from("tasks")
      .update(dbUpdates)
      .eq("id", id)
      .select();

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      throw new Error("No data returned after update or task not found");
    }

    return {
      id: data[0].id,
      title: data[0].title,
      completed: data[0].completed,
      date: data[0].date || undefined,
      project: data[0].project || undefined,
      description: data[0].description || undefined,
      icon: data[0].icon || undefined,
      completed_at: data[0].completed_at || undefined,
      updated_at: data[0].updated_at || undefined,
      user_id: data[0].user_id || undefined,
      sort_order: data[0].sort_order !== null ? data[0].sort_order : undefined,
      deleted: data[0].deleted || false,
      deleted_at: data[0].deleted_at || undefined,
      abandoned: data[0].abandoned || false,
      abandoned_at: data[0].abandoned_at || undefined,
      attachments: (() => {
        try {
          return data[0].attachments && typeof data[0].attachments === 'string'
            ? JSON.parse(data[0].attachments)
            : (data[0].attachments || []);
        } catch (e) {
          console.warn('Failed to parse attachments:', e);
          return [];
        }
      })(),
    };
  } catch (error) {
    console.error("Error updating task:", error);
    toast({
      title: "更新失败",
      description: "无法更新任务，请稍后再试",
      variant: "destructive",
    });
    return null;
  }
};

// Move a task to trash (soft delete)
export const moveToTrash = async (id: string): Promise<boolean> => {
  try {
    // Get current user to verify ownership
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast({
        title: "未登录",
        description: "请先登录后再删除任务",
        variant: "destructive",
      });
      return false;
    }

    // First, get the task to check if it's in a shared project
    const { data: taskData, error: taskError } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", id)
      .single();

    if (taskError) {
      throw taskError;
    }

    // Check if the user has permission to trash this task
    let hasPermission = taskData.user_id === user.id; // User is the creator

    // If not the creator and task is in a project, check if user is a member of the project
    if (!hasPermission && taskData.project) {
      const { data: memberData, error: memberError } = await supabase
        .from('project_members')
        .select('id')
        .eq('project_id', taskData.project)
        .eq('user_id', user.id)
        .maybeSingle();

      if (memberError) {
        console.error("Error checking project membership:", memberError);
      }

      hasPermission = !!memberData; // User is a member of the project
    }

    if (!hasPermission) {
      toast({
        title: "删除失败",
        description: "您没有权限删除此任务",
        variant: "destructive",
      });
      return false;
    }

    const { error } = await supabase
      .from("tasks")
      .update({
        deleted: true,
        deleted_at: new Date().toISOString()
      })
      .eq("id", id);

    if (error) {
      throw error;
    }

    toast({
      title: "删除成功",
      description: "任务已移至垃圾桶",
    });

    return true;
  } catch (error) {
    console.error("Error moving task to trash:", error);
    toast({
      title: "删除失败",
      description: "无法删除任务，请稍后再试",
      variant: "destructive",
    });
    return false;
  }
};

// Restore a task from trash
export const restoreFromTrash = async (id: string): Promise<boolean> => {
  try {
    // Get current user to verify ownership
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast({
        title: "未登录",
        description: "请先登录后再恢复任务",
        variant: "destructive",
      });
      return false;
    }

    // First, get the task to check if it's in a shared project
    const { data: taskData, error: taskError } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", id)
      .single();

    if (taskError) {
      throw taskError;
    }

    // Check if the user has permission to restore this task
    let hasPermission = taskData.user_id === user.id; // User is the creator

    // If not the creator and task is in a project, check if user is a member of the project
    if (!hasPermission && taskData.project) {
      const { data: memberData, error: memberError } = await supabase
        .from('project_members')
        .select('id')
        .eq('project_id', taskData.project)
        .eq('user_id', user.id)
        .maybeSingle();

      if (memberError) {
        console.error("Error checking project membership:", memberError);
      }

      hasPermission = !!memberData; // User is a member of the project
    }

    if (!hasPermission) {
      toast({
        title: "恢复失败",
        description: "您没有权限恢复此任务",
        variant: "destructive",
      });
      return false;
    }

    const { error } = await supabase
      .from("tasks")
      .update({
        deleted: false,
        deleted_at: null
      })
      .eq("id", id);

    if (error) {
      throw error;
    }

    toast({
      title: "恢复成功",
      description: "任务已恢复",
    });

    return true;
  } catch (error) {
    console.error("Error restoring task from trash:", error);
    toast({
      title: "恢复失败",
      description: "无法恢复任务，请稍后再试",
      variant: "destructive",
    });
    return false;
  }
};

// Permanently delete a task
export const deleteTask = async (id: string): Promise<boolean> => {
  try {
    // Get current user to verify ownership
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast({
        title: "未登录",
        description: "请先登录后再删除任务",
        variant: "destructive",
      });
      return false;
    }

    // First, get the task to check if it's in a shared project
    const { data: taskData, error: taskError } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", id)
      .single();

    if (taskError) {
      throw taskError;
    }

    // Check if the user has permission to delete this task
    let hasPermission = taskData.user_id === user.id; // User is the creator

    // If not the creator and task is in a project, check if user is a member of the project
    if (!hasPermission && taskData.project) {
      const { data: memberData, error: memberError } = await supabase
        .from('project_members')
        .select('role')
        .eq('project_id', taskData.project)
        .eq('user_id', user.id)
        .maybeSingle();

      if (memberError) {
        console.error("Error checking project membership:", memberError);
      }

      // Only project owners or the task creator can permanently delete tasks
      hasPermission = memberData && memberData.role === 'owner';
    }

    if (!hasPermission) {
      toast({
        title: "删除失败",
        description: "您没有权限永久删除此任务",
        variant: "destructive",
      });
      return false;
    }

    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", id);

    if (error) {
      throw error;
    }

    toast({
      title: "删除成功",
      description: "任务已永久删除",
    });

    return true;
  } catch (error) {
    console.error("Error deleting task:", error);
    toast({
      title: "删除失败",
      description: "无法删除任务，请稍后再试",
      variant: "destructive",
    });
    return false;
  }
};

// Update task order in database
export const updateTaskOrder = async (tasks: Task[]): Promise<boolean> => {
  try {
    // Get current user to verify ownership
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast({
        title: "未登录",
        description: "请先登录后再更新任务顺序",
        variant: "destructive",
      });
      return false;
    }

    // Calculate new sort_order values with even spacing (1000 between each task)
    const tasksWithOrder = tasks.map((task, index) => ({
      id: task.id,
      // Use index * 1000 to leave room for inserting tasks between existing ones
      sort_order: (index + 1) * 1000
    }));

    // Update tasks in batch
    for (const task of tasksWithOrder) {
      const { error } = await supabase
        .from("tasks")
        .update({ sort_order: task.sort_order })
        .eq("id", task.id)
        .eq("user_id", user.id);

      if (error) {
        throw error;
      }
    }

    return true;
  } catch (error) {
    console.error("Error updating task order:", error);
    toast({
      title: "排序失败",
      description: "无法更新任务顺序，请稍后再试",
      variant: "destructive",
    });
    return false;
  }
};

// Fetch only abandoned tasks 
export const fetchAbandonedTasks = async (): Promise<Task[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast({
        title: "未登录",
        description: "请先登录后再查看已放弃的任务",
        variant: "destructive",
      });
      return [];
    }

    // First, get all projects the user is a member of
    const { data: memberProjects, error: memberError } = await supabase
      .from('project_members')
      .select('project_id')
      .eq('user_id', user.id);

    if (memberError) {
      throw memberError;
    }

    // Extract project IDs
    const memberProjectIds = memberProjects.map(mp => mp.project_id);

    // Build the query for abandoned tasks
    let query = supabase.from("tasks").select("*");

    // If there are member projects, include them in the query
    if (memberProjectIds.length > 0) {
      query = query.or(`user_id.eq.${user.id},project.in.(${memberProjectIds.join(',')})`);
    } else {
      query = query.eq("user_id", user.id);
    }

    // Add filters for abandoned tasks (only non-deleted, abandoned tasks)
    query = query.eq("abandoned", true).eq("deleted", false).order("abandoned_at", { ascending: false }); // Most recently abandoned first

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    // Ensure we properly map the data to our Task type
    return (data || []).map((item): Task => ({
      id: item.id,
      title: item.title,
      completed: item.completed,
      date: item.date || undefined,
      project: item.project || undefined,
      description: item.description || undefined,
      icon: item.icon || undefined,
      completed_at: item.completed_at || undefined,
      updated_at: item.updated_at || undefined,
      user_id: item.user_id || undefined,
      sort_order: item.sort_order !== null ? item.sort_order : undefined,
      deleted: item.deleted || false,
      deleted_at: item.deleted_at || undefined,
      abandoned: item.abandoned || false,
      abandoned_at: item.abandoned_at || undefined,
      attachments: (() => {
        try {
          return item.attachments && typeof item.attachments === 'string' 
            ? JSON.parse(item.attachments) 
            : (item.attachments || []);
        } catch (e) {
          console.warn('Failed to parse attachments:', e);
          return [];
        }
      })(),
    }));
  } catch (error) {
    console.error("Error fetching abandoned tasks:", error);
    toast({
      title: "读取已放弃任务失败",
      description: "无法获取已放弃任务列表，请稍后再试",
      variant: "destructive",
    });
    return [];
  }
};

// Abandon a task
export const abandonTask = async (id: string): Promise<boolean> => {
  try {
    // Get current user to verify ownership
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast({
        title: "未登录",
        description: "请先登录后再放弃任务",
        variant: "destructive",
      });
      return false;
    }

    // First, get the task to check if it's in a shared project
    const { data: taskData, error: taskError } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", id)
      .single();

    if (taskError) {
      throw taskError;
    }

    // Check if the user has permission to abandon this task
    let hasPermission = taskData.user_id === user.id; // User is the creator

    // If not the creator and task is in a project, check if user is a member of the project
    if (!hasPermission && taskData.project) {
      const { data: memberData, error: memberError } = await supabase
        .from('project_members')
        .select('id')
        .eq('project_id', taskData.project)
        .eq('user_id', user.id)
        .maybeSingle();

      if (memberError) {
        console.error("Error checking project membership:", memberError);
      }

      hasPermission = !!memberData; // User is a member of the project
    }

    if (!hasPermission) {
      toast({
        title: "放弃失败",
        description: "您没有权限放弃此任务",
        variant: "destructive",
      });
      return false;
    }

    const { error } = await supabase
      .from("tasks")
      .update({ 
        abandoned: true, 
        abandoned_at: new Date().toISOString(),
        completed: false, // 确保放弃的任务不是完成状态
        completed_at: null
      })
      .eq("id", id);

    if (error) {
      throw error;
    }

    toast({
      title: "任务已放弃",
      description: "任务已标记为放弃",
    });

    return true;
  } catch (error) {
    console.error("Error abandoning task:", error);
    toast({
      title: "放弃失败",
      description: "无法放弃任务，请稍后再试",
      variant: "destructive",
    });
    return false;
  }
};

// Restore abandoned task
export const restoreAbandonedTask = async (id: string): Promise<boolean> => {
  try {
    // Get current user to verify ownership
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast({
        title: "未登录",
        description: "请先登录后再恢复任务",
        variant: "destructive",
      });
      return false;
    }

    // First, get the task to check if it's in a shared project
    const { data: taskData, error: taskError } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", id)
      .single();

    if (taskError) {
      throw taskError;
    }

    // Check if the user has permission to restore this task
    let hasPermission = taskData.user_id === user.id; // User is the creator

    // If not the creator and task is in a project, check if user is a member of the project
    if (!hasPermission && taskData.project) {
      const { data: memberData, error: memberError } = await supabase
        .from('project_members')
        .select('id')
        .eq('project_id', taskData.project)
        .eq('user_id', user.id)
        .maybeSingle();

      if (memberError) {
        console.error("Error checking project membership:", memberError);
      }

      hasPermission = !!memberData; // User is a member of the project
    }

    if (!hasPermission) {
      toast({
        title: "恢复失败",
        description: "您没有权限恢复此任务",
        variant: "destructive",
      });
      return false;
    }

    const { error } = await supabase
      .from("tasks")
      .update({ 
        abandoned: false, 
        abandoned_at: null
      })
      .eq("id", id);

    if (error) {
      throw error;
    }

    toast({
      title: "任务已恢复",
      description: "任务已从放弃状态恢复",
    });

    return true;
  } catch (error) {
    console.error("Error restoring abandoned task:", error);
    toast({
      title: "恢复失败",
      description: "无法恢复任务，请稍后再试",
      variant: "destructive",
    });
    return false;
  }
};
