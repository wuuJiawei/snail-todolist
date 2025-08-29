import { supabase } from "@/integrations/supabase/client";
import { Tag, TaskTagLink } from "@/types/tag";
import { toast } from "@/hooks/use-toast";

export const fetchAllTags = async (projectId?: string | null): Promise<Tag[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    let query = supabase.from("tags").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (projectId === null) {
      query = query.is("project_id", null);
    } else if (projectId) {
      query = query.eq("project_id", projectId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as Tag[];
  } catch (error) {
    console.error("Error fetching tags:", error);
    toast({ title: "读取标签失败", description: "无法获取标签列表", variant: "destructive" });
    return [];
  }
};

export const createTag = async (name: string, projectId?: string | null): Promise<Tag | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "未登录", description: "请先登录后再创建标签", variant: "destructive" });
      return null;
    }

    const payload: Partial<Tag> = { name, user_id: user.id, project_id: projectId ?? null };
    const { data, error } = await supabase.from("tags").insert(payload).select().maybeSingle();

    if (error) {
      // unique constraint violation -> 提示复用
      if ((error as any).code === "23505") {
        toast({ title: "标签已存在", description: `「${name}」已存在`, variant: "default" });
        return null;
      }
      throw error;
    }
    return (data as Tag) ?? null;
  } catch (error) {
    console.error("Error creating tag:", error);
    toast({ title: "创建失败", description: "无法创建标签", variant: "destructive" });
    return null;
  }
};

export const renameTag = async (tagId: string, name: string): Promise<Tag | null> => {
  try {
    const { data, error } = await supabase.from("tags").update({ name }).eq("id", tagId).select().maybeSingle();
    if (error) throw error;
    return (data as Tag) ?? null;
  } catch (error) {
    console.error("Error renaming tag:", error);
    toast({ title: "重命名失败", description: "无法重命名标签", variant: "destructive" });
    return null;
  }
};

export const deleteTagById = async (tagId: string): Promise<boolean> => {
  try {
    const { error } = await supabase.from("tags").delete().eq("id", tagId);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error deleting tag:", error);
    toast({ title: "删除失败", description: "无法删除标签", variant: "destructive" });
    return false;
  }
};

export const getTagsForTask = async (taskId: string): Promise<Tag[]> => {
  try {
    const { data: links, error: linkError } = await supabase
      .from("task_tags")
      .select("tag_id")
      .eq("task_id", taskId);
    if (linkError) throw linkError;
    const tagIds = (links || []).map(l => l.tag_id);
    if (tagIds.length === 0) return [];
    const { data, error } = await supabase.from("tags").select("*").in("id", tagIds);
    if (error) throw error;
    return (data || []) as Tag[];
  } catch (error) {
    console.error("Error fetching tags for task:", error);
    return [];
  }
};

export const getTagsByTaskIds = async (taskIds: string[]): Promise<Record<string, Tag[]>> => {
  const result: Record<string, Tag[]> = {};
  if (taskIds.length === 0) return result;
  try {
    const { data: links, error: linkError } = await supabase
      .from("task_tags")
      .select("task_id, tag_id")
      .in("task_id", taskIds);
    if (linkError) throw linkError;
    const tagIds = Array.from(new Set((links || []).map(l => l.tag_id)));
    let tags: Tag[] = [];
    if (tagIds.length > 0) {
      const { data: tagRows, error: tagError } = await supabase.from("tags").select("*").in("id", tagIds);
      if (tagError) throw tagError;
      tags = (tagRows || []) as Tag[];
    }
    const tagMap = new Map(tags.map(t => [t.id, t] as const));
    for (const tid of taskIds) result[tid] = [];
    (links || []).forEach(l => {
      const tag = tagMap.get(l.tag_id);
      if (!tag) return;
      if (!result[l.task_id]) result[l.task_id] = [];
      result[l.task_id].push(tag);
    });
    return result;
  } catch (error) {
    console.error("Error fetching tags by task ids:", error);
    return {};
  }
};

export const attachTagToTask = async (taskId: string, tagId: string): Promise<boolean> => {
  try {
    const { error } = await supabase.from("task_tags").insert({ task_id: taskId, tag_id: tagId } as TaskTagLink);
    if (error) {
      // ignore duplicates
      if ((error as any).code === "23505") return true;
      throw error;
    }
    return true;
  } catch (error) {
    console.error("Error attaching tag:", error);
    toast({ title: "关联失败", description: "无法给任务添加标签", variant: "destructive" });
    return false;
  }
};

export const detachTagFromTask = async (taskId: string, tagId: string): Promise<boolean> => {
  try {
    const { error } = await supabase.from("task_tags").delete().match({ task_id: taskId, tag_id: tagId });
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error detaching tag:", error);
    toast({ title: "移除失败", description: "无法从任务移除标签", variant: "destructive" });
    return false;
  }
};

export const updateTagProject = async (tagId: string, projectId: string | null): Promise<Tag | null> => {
  try {
    const { data, error } = await supabase
      .from("tags")
      .update({ project_id: projectId })
      .eq("id", tagId)
      .select()
      .maybeSingle();
    
    if (error) throw error;
    
    if (projectId === null) {
      toast({ title: "已更新", description: "标签已设为全局可见", variant: "default" });
    } else {
      toast({ title: "已更新", description: "已更新标签可见范围", variant: "default" });
    }
    
    return (data as Tag) ?? null;
  } catch (error) {
    console.error("Error updating tag project:", error);
    toast({ title: "更新失败", description: "无法更新标签所属项目", variant: "destructive" });
    return null;
  }
};


