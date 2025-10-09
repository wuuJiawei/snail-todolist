import { supabase } from "@/integrations/supabase/client";
import { Task } from "@/types/task";
import { toast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from "uuid";

// 游客ID本地存储key
const GUEST_ID_KEY = "snail_guest_id";

// 获取或创建游客ID
const getOrCreateGuestId = (): string => {
  let guestId = localStorage.getItem(GUEST_ID_KEY);
  if (!guestId) {
    guestId = uuidv4();
    localStorage.setItem(GUEST_ID_KEY, guestId);
  }
  return guestId;
};

// 设置Supabase请求头中的游客ID
const setGuestIdHeader = () => {
  const guestId = getOrCreateGuestId();
  
  // 为请求添加自定义请求头
  // 注意: Supabase客户端不直接支持设置全局请求头，但可以在每个请求上设置
  const customHeaders = {
    'x-anonymous-id': guestId
  };
  
  // 返回游客ID以便在API调用中使用
  return guestId;
};

// Fetch all tasks for the current user (excluding deleted tasks by default)
export const fetchTasks = async (includeDeleted: boolean = false, isGuest: boolean = false): Promise<Task[]> => {
  try {
    // 游客模式
    if (isGuest) {
      const guestId = setGuestIdHeader();
      
      // 使用headers选项设置请求头
      let query = supabase.from("tasks").select("*", { 
        headers: { 'x-anonymous-id': guestId } 
      });
      query = query.eq("anonymous_id", guestId);
      
      if (!includeDeleted) {
        query = query.eq("deleted", false).eq("abandoned", false);
      }
      
      const { data, error } = await query
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });
      
      if (error) {
        throw error;
      }
      
      return (data || []).map(mapTaskData);
    }

    // 正常登录用户模式
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
    return (data || []).map(mapTaskData);
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

// 统一的Task数据映射函数
const mapTaskData = (item: any): Task => {
  // Normalize attachments: database may return JSON string or array
  let normalizedAttachments: any[] = [];
  const raw = item.attachments;
  if (Array.isArray(raw)) {
    normalizedAttachments = raw;
  } else if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      normalizedAttachments = Array.isArray(parsed) ? parsed : [];
    } catch {
      normalizedAttachments = [];
    }
  } else if (raw && typeof raw === 'object') {
    // Some drivers may return object for JSON
    normalizedAttachments = [];
  }

  return {
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
    // Note: anonymous_id is used in guest mode flows but not in Task type; omit
    attachments: normalizedAttachments
  };
};

// Fetch only deleted tasks (trash)
export const fetchDeletedTasks = async (isGuest: boolean = false): Promise<Task[]> => {
  try {
    // 游客模式
    if (isGuest) {
      const guestId = setGuestIdHeader();
      
      // 使用headers选项设置请求头
      const { data, error } = await supabase.from("tasks")
        .select("*", { 
          headers: { 'x-anonymous-id': guestId } 
        })
        .eq("anonymous_id", guestId)
        .eq("deleted", true)
        .eq("abandoned", false)
        .order("deleted_at", { ascending: false });
      
      if (error) {
        throw error;
      }
      
      return (data || []).map(mapTaskData);
    }

    // 正常登录用户模式
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
    return (data || []).map(mapTaskData);
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
export const addTask = async (task: Omit<Task, "id">, isGuest: boolean = false): Promise<Task | null> => {
  try {
    // 游客模式添加任务
    if (isGuest) {
      const guestId = setGuestIdHeader();
      
      // 获取当前游客任务的最小排序值（新任务添加到顶部）
      const { data: minOrderData, error: minOrderError } = await supabase
        .from("tasks")
        .select("sort_order")
        .eq("anonymous_id", guestId)
        .eq("completed", task.completed)
        .order("sort_order", { ascending: true })
        .limit(1);
      
      if (minOrderError) {
        console.error("Error getting min sort order:", minOrderError);
      }
      
      // 计算下一个排序值（比当前最小值小 1000）
      // 这样确保新任务显示在顶部
      const minOrder = minOrderData && minOrderData.length > 0 && minOrderData[0].sort_order !== null
        ? minOrderData[0].sort_order
        : 1000;
      const nextSortOrder = minOrder - 1000;
      
      // 添加游客ID和排序值到任务
      const taskWithGuestId = {
        ...task,
        anonymous_id: guestId,
        sort_order: nextSortOrder,
        // 转换附件数组为JSON字符串
        attachments: task.attachments ? JSON.stringify(task.attachments) : '[]'
      };
      
      const { data, error } = await supabase
        .from("tasks")
        .insert(taskWithGuestId)
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
      
      return mapTaskData(data[0]);
    }

    // 正常登录用户模式
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

    // Get the lowest sort_order for the project (to add new task at the top)
    const { data: minOrderData, error: minOrderError } = await supabase
      .from("tasks")
      .select("sort_order")
      .eq("project", task.project)
      .eq("completed", task.completed)
      .order("sort_order", { ascending: true })
      .limit(1);

    if (minOrderError) {
      console.error("Error getting min sort order:", minOrderError);
    }

    // Calculate the next sort order (1000 lower than the current min)
    // This ensures new tasks appear at the top
    const minOrder = minOrderData && minOrderData.length > 0 && minOrderData[0].sort_order !== null
      ? minOrderData[0].sort_order
      : 1000;
    const nextSortOrder = minOrder - 1000;

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

    return mapTaskData(data[0]);
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
  updates: Partial<Task>,
  isGuest: boolean = false
): Promise<Task | null> => {
  try {
    // 游客模式更新任务
    if (isGuest) {
      const guestId = setGuestIdHeader();
      
      // 首先检查任务是否属于当前游客
      const { data: taskData, error: taskError } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", id)
        .eq("anonymous_id", guestId)
        .single();
      
      if (taskError) {
        throw taskError;
      }
      
      // 如果任务被标记为已完成，设置完成时间
      if (updates.completed === true) {
        updates.completed_at = new Date().toISOString();
      }
      // 如果任务被标记为未完成，移除完成时间
      else if (updates.completed === false) {
        updates.completed_at = null;
      }
      
      // 准备数据库更新 - 转换附件数组为JSON字符串
      const dbUpdates = { ...updates };
      if (dbUpdates.attachments !== undefined) {
        dbUpdates.attachments = JSON.stringify(dbUpdates.attachments || []);
      }
      
      const { data, error } = await supabase
        .from("tasks")
        .update(dbUpdates)
        .eq("id", id)
        .eq("anonymous_id", guestId)
        .select();
      
      if (error) {
        throw error;
      }
      
      if (!data || data.length === 0) {
        throw new Error("No data returned after update or task not found");
      }
      
      return mapTaskData(data[0]);
    }

    // 正常登录用户模式
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

    return mapTaskData(data[0]);
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
export const moveToTrash = async (id: string, isGuest: boolean = false): Promise<boolean> => {
  try {
    // 游客模式
    if (isGuest) {
      const guestId = setGuestIdHeader();
      
      // 检查任务是否属于当前游客
      const { data: taskData, error: taskError } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", id)
        .eq("anonymous_id", guestId)
        .single();
      
      if (taskError) {
        throw taskError;
      }
      
      const { error } = await supabase
        .from("tasks")
        .update({
          deleted: true,
          deleted_at: new Date().toISOString()
        })
        .eq("id", id)
        .eq("anonymous_id", guestId);
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "删除成功",
        description: "任务已移至垃圾桶",
      });
      
      return true;
    }
    
    // 以下是原有的代码
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
export const restoreFromTrash = async (id: string, isGuest: boolean = false): Promise<boolean> => {
  try {
    // 游客模式
    if (isGuest) {
      const guestId = setGuestIdHeader();
      
      // 检查任务是否属于当前游客
      const { data: taskData, error: taskError } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", id)
        .eq("anonymous_id", guestId)
        .single();
      
      if (taskError) {
        throw taskError;
      }
      
      const { error } = await supabase
        .from("tasks")
        .update({
          deleted: false,
          deleted_at: null
        })
        .eq("id", id)
        .eq("anonymous_id", guestId);
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "恢复成功",
        description: "任务已恢复",
      });
      
      return true;
    }
    
    // 以下是原有的代码
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
export const deleteTask = async (id: string, isGuest: boolean = false): Promise<boolean> => {
  try {
    // 游客模式
    if (isGuest) {
      const guestId = setGuestIdHeader();
      
      // 检查任务是否属于当前游客
      const { data: taskData, error: taskError } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", id)
        .eq("anonymous_id", guestId)
        .single();
      
      if (taskError) {
        throw taskError;
      }
      
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", id)
        .eq("anonymous_id", guestId);
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "删除成功",
        description: "任务已永久删除",
      });
      
      return true;
    }
    
    // 以下是原有的代码
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
export const updateTaskOrder = async (tasks: Task[], isGuest: boolean = false): Promise<boolean> => {
  try {
    // 游客模式
    if (isGuest) {
      const guestId = setGuestIdHeader();
      
      // 计算新的排序值，使用游客ID作为过滤条件
      const tasksWithOrder = tasks.map((task, index) => ({
        id: task.id,
        // 使用index * 1000作为排序值，确保游客任务之间有足够的间隔
        sort_order: (index + 1) * 1000,
        anonymous_id: guestId // 添加游客ID过滤条件
      }));
      
      // 批量更新任务
      for (const task of tasksWithOrder) {
        const { error } = await supabase
          .from("tasks")
          .update({ sort_order: task.sort_order })
          .eq("id", task.id)
          .eq("anonymous_id", guestId); // 添加游客ID过滤条件
        
        if (error) {
          throw error;
        }
      }
      
      return true;
    }
    
    // 以下是原有的代码
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
export const fetchAbandonedTasks = async (isGuest: boolean = false): Promise<Task[]> => {
  try {
    // 游客模式
    if (isGuest) {
      const guestId = setGuestIdHeader();
      
      let query = supabase.from("tasks")
        .select("*")
        .eq("anonymous_id", guestId)
        .eq("abandoned", true)
        .eq("deleted", false)
        .order("abandoned_at", { ascending: false });
      
      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      return (data || []).map(mapTaskData);
    }
    
    // 正常登录用户模式
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
    return (data || []).map(mapTaskData);
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
export const abandonTask = async (id: string, isGuest: boolean = false): Promise<boolean> => {
  try {
    // 游客模式
    if (isGuest) {
      const guestId = setGuestIdHeader();
      
      // 首先检查任务是否属于当前游客
      const { data: taskData, error: taskError } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", id)
        .eq("anonymous_id", guestId)
        .single();
      
      if (taskError) {
        throw taskError;
      }
      
      const { error } = await supabase
        .from("tasks")
        .update({ 
          abandoned: true, 
          abandoned_at: new Date().toISOString(),
          completed: false, // 确保放弃的任务不是完成状态
          completed_at: null
        })
        .eq("id", id)
        .eq("anonymous_id", guestId);
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "任务已放弃",
        description: "任务已标记为放弃",
      });
      
      return true;
    }
    
    // 以下是原有的代码
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
export const restoreAbandonedTask = async (id: string, isGuest: boolean = false): Promise<boolean> => {
  try {
    // 游客模式
    if (isGuest) {
      const guestId = setGuestIdHeader();
      
      // 首先检查任务是否属于当前游客
      const { data: taskData, error: taskError } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", id)
        .eq("anonymous_id", guestId)
        .single();
      
      if (taskError) {
        throw taskError;
      }
      
      const { error } = await supabase
        .from("tasks")
        .update({ 
          abandoned: false, 
          abandoned_at: null
        })
        .eq("id", id)
        .eq("anonymous_id", guestId);
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "任务已恢复",
        description: "任务已从放弃状态恢复",
      });
      
      return true;
    }
    
    // 以下是原有的代码
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
