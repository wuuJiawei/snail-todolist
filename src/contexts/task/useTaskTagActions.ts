import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DataError } from "@/data/contracts/errors";
import * as storageOps from "@/data/operations";
import type { Tag } from "@/types/tag";
import type { Task } from "@/types/task";
import { tagKeys, tagQueries } from "@/queries/tagQueries";
import { useToast } from "@/hooks/use-toast";

const EMPTY_TASK_TAGS: Record<string, Tag[]> = {};

export function useTaskTagActions(tasks: Task[], tagTaskIds: string[], recordTaskActivity: (taskId: string, action: string, metadata?: Record<string, unknown>) => Promise<void>) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [tagsVersion, setTagsVersion] = useState(0);
  const taskMappingKey = useMemo(() => tagKeys.forTasks(tagTaskIds), [tagTaskIds]);
  const { data: taskIdToTags = EMPTY_TASK_TAGS } = useQuery({
    ...tagQueries.forTasks(tagTaskIds),
    enabled: tagTaskIds.length > 0,
    placeholderData: (previous) => previous,
  });
  const incrementTagsVersion = useCallback(() => setTagsVersion((version) => version + 1), []);
  const setTaskIdToTags = useCallback((mapping: Record<string, Tag[]>) => queryClient.setQueryData(taskMappingKey, mapping), [queryClient, taskMappingKey]);

  const getTaskTags = useCallback((taskId: string): Tag[] => taskIdToTags[taskId] || [], [taskIdToTags]);
  const attachTagToTask = useCallback(async (taskId: string, tagId: string, tagData?: Tag) => {
    const previousMapping = queryClient.getQueryData<Record<string, Tag[]>>(taskMappingKey) ?? taskIdToTags;
    const previousTags = previousMapping[taskId] || [];
    if (previousTags.some((tag) => tag.id === tagId)) return;
    const cachedLists = queryClient.getQueriesData<Tag[]>({ queryKey: tagKeys.scopes() });
    const optimisticTag = tagData ?? cachedLists.flatMap(([, list]) => list ?? []).find((tag) => tag.id === tagId);
    const optimisticTags = optimisticTag ? [...previousTags, optimisticTag] : previousTags;
    setTaskIdToTags({ ...previousMapping, [taskId]: optimisticTags });
    incrementTagsVersion();
    try {
      await storageOps.attachTagToTask(taskId, tagId);
      await recordTaskActivity(taskId, "tag_added", { tagId, tagName: optimisticTag?.name ?? "" });
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
    setTaskIdToTags({ ...previousMapping, [taskId]: previousTags.filter((tag) => tag.id !== tagId) });
    incrementTagsVersion();
    try {
      await storageOps.detachTagFromTask(taskId, tagId);
      await recordTaskActivity(taskId, "tag_removed", { tagId, tagName: removedTag?.name ?? "" });
    } catch (error) {
      setTaskIdToTags(previousMapping);
      incrementTagsVersion();
      toast({ title: "移除失败", description: "无法从任务移除标签", variant: "destructive" });
      throw error;
    }
  }, [queryClient, taskMappingKey, taskIdToTags, setTaskIdToTags, incrementTagsVersion, recordTaskActivity, toast]);

  const snapshotTagCache = useCallback(() => queryClient.getQueriesData({ queryKey: tagKeys.all }), [queryClient]);
  const restoreTagCache = useCallback((snapshot: Array<[readonly unknown[], unknown]>) => {
    queryClient.removeQueries({ queryKey: tagKeys.all });
    for (const [key, value] of snapshot) queryClient.setQueryData(key, value);
    incrementTagsVersion();
  }, [queryClient, incrementTagsVersion]);
  const syncTagUpdate = useCallback((tagId: string, updates: Partial<Tag>, options?: { removeFromCache?: boolean; oldProjectId?: string | null }) => {
    const updateList = (list: Tag[] | undefined) => (list ?? []).map((tag) => tag.id === tagId ? { ...tag, ...updates } : tag);
    if (options?.removeFromCache) {
      queryClient.setQueriesData<Tag[]>({ queryKey: tagKeys.scopes() }, (list) => (list ?? []).filter((tag) => tag.id !== tagId));
      queryClient.setQueryData<Tag[]>(tagKeys.allVisible(), (list = []) => list.filter((tag) => tag.id !== tagId));
    } else if (options?.oldProjectId !== undefined && updates.project_id !== undefined) {
      const oldList = queryClient.getQueryData<Tag[]>(tagKeys.forScope(options.oldProjectId)) ?? [];
      const movedTag = oldList.find((tag) => tag.id === tagId);
      queryClient.setQueryData<Tag[]>(tagKeys.forScope(options.oldProjectId), oldList.filter((tag) => tag.id !== tagId));
      if (movedTag) queryClient.setQueryData<Tag[]>(tagKeys.forScope(updates.project_id), (list = []) => [{ ...movedTag, ...updates }, ...list.filter((tag) => tag.id !== tagId)]);
      queryClient.setQueryData<Tag[]>(tagKeys.allVisible(), updateList);
    } else {
      queryClient.setQueriesData<Tag[]>({ queryKey: tagKeys.scopes() }, updateList);
      queryClient.setQueryData<Tag[]>(tagKeys.allVisible(), updateList);
    }
    queryClient.setQueriesData<Record<string, Tag[]>>({ queryKey: tagKeys.taskMappings() }, (mapping = {}) => Object.fromEntries(Object.entries(mapping).map(([taskId, tags]) => [taskId, options?.removeFromCache ? tags.filter((tag) => tag.id !== tagId) : tags.map((tag) => tag.id === tagId ? { ...tag, ...updates } : tag)])));
    incrementTagsVersion();
  }, [queryClient, incrementTagsVersion]);

  const listAllTags = useCallback(async (projectId?: string | null) => {
    if (projectId === undefined) return queryClient.ensureQueryData(tagQueries.allVisible());
    const data = await queryClient.ensureQueryData(tagQueries.forScope(projectId ?? null));
    if (projectId !== null) return [...data, ...await queryClient.ensureQueryData(tagQueries.forScope(null))];
    return data;
  }, [queryClient]);
  const refreshAllTags = useCallback(async () => {
    try { await queryClient.invalidateQueries({ queryKey: tagKeys.all, refetchType: "all" }); incrementTagsVersion(); return true; }
    catch (error) { console.error("Failed to refresh tags:", error); return false; }
  }, [queryClient, incrementTagsVersion]);
  const ensureTagsLoaded = useCallback(async (projectId?: string | null) => {
    if (projectId !== null && projectId !== undefined) await queryClient.ensureQueryData(tagQueries.forScope(null));
    await queryClient.ensureQueryData(tagQueries.forScope(projectId ?? null));
    incrementTagsVersion();
  }, [queryClient, incrementTagsVersion]);
  const createTag = useCallback(async (name: string, projectId?: string | null) => {
    try {
      const tag = await storageOps.createTag(name, projectId);
      queryClient.setQueryData<Tag[]>(tagKeys.forScope(projectId ?? null), (list = []) => [tag, ...list.filter((existing) => existing.id !== tag.id)]);
      queryClient.setQueryData<Tag[]>(tagKeys.allVisible(), (list = []) => [tag, ...list.filter((existing) => existing.id !== tag.id)]);
      incrementTagsVersion();
      return tag;
    } catch (error) {
      const conflict = error instanceof DataError && error.code === "CONFLICT";
      toast({ title: conflict ? "标签已存在" : "创建失败", description: conflict ? `「${name}」已存在` : "无法创建标签", variant: conflict ? "default" : "destructive" });
      return null;
    }
  }, [queryClient, incrementTagsVersion, toast]);
  const deleteTagPermanently = useCallback(async (tagId: string) => {
    const snapshot = snapshotTagCache();
    syncTagUpdate(tagId, {}, { removeFromCache: true });
    try { if (!await storageOps.deleteTagById(tagId)) throw new Error("Delete tag failed"); await queryClient.invalidateQueries({ queryKey: tagKeys.all }); return true; }
    catch { restoreTagCache(snapshot); toast({ title: "删除标签失败", variant: "destructive" }); return false; }
  }, [queryClient, snapshotTagCache, syncTagUpdate, restoreTagCache, toast]);
  const updateTagProject = useCallback(async (tagId: string, projectId: string | null) => {
    const snapshot = snapshotTagCache();
    const cachedTag = queryClient.getQueriesData<Tag[]>({ queryKey: tagKeys.scopes() }).flatMap(([, list]) => list ?? []).find((tag) => tag.id === tagId);
    syncTagUpdate(tagId, { project_id: projectId }, { oldProjectId: cachedTag?.project_id ?? null });
    try {
      const updatedTag = await storageOps.updateTagProject(tagId, projectId);
      if (!updatedTag) throw new Error("Update tag project failed");
      await queryClient.invalidateQueries({ queryKey: tagKeys.all });
      toast({ title: "已更新", description: projectId === null ? "标签已设为全局可见" : "已更新标签可见范围" });
      return updatedTag;
    } catch { restoreTagCache(snapshot); toast({ title: "修改标签范围失败", variant: "destructive" }); return null; }
  }, [queryClient, snapshotTagCache, syncTagUpdate, restoreTagCache, toast]);
  const renameTag = useCallback(async (tagId: string, newName: string) => {
    const snapshot = snapshotTagCache();
    syncTagUpdate(tagId, { name: newName });
    try { const updatedTag = await storageOps.updateTag(tagId, { name: newName }); if (!updatedTag) throw new Error("Rename tag failed"); await queryClient.invalidateQueries({ queryKey: tagKeys.all }); return updatedTag; }
    catch { restoreTagCache(snapshot); toast({ title: "重命名标签失败", variant: "destructive" }); return null; }
  }, [queryClient, snapshotTagCache, syncTagUpdate, restoreTagCache, toast]);
  const getAllTagUsageCounts = useCallback(() => {
    const counts: Record<string, number> = {};
    tasks.filter((task) => !task.completed && !task.abandoned).forEach((task) => (taskIdToTags[task.id] || []).forEach((tag) => { counts[tag.id] = (counts[tag.id] || 0) + 1; }));
    return counts;
  }, [tasks, taskIdToTags]);
  const getCachedTags = useCallback((projectId?: string | null) => {
    const projectSpecificTags = queryClient.getQueryData<Tag[]>(tagKeys.forScope(projectId ?? null)) || [];
    if (projectId !== null && projectId !== undefined) return [...projectSpecificTags, ...(queryClient.getQueryData<Tag[]>(tagKeys.forScope(null)) || [])];
    return projectSpecificTags;
  }, [queryClient]);

  return { taskIdToTags, getTaskTags, attachTagToTask, detachTagFromTask, listAllTags, createTag, deleteTagPermanently, updateTagProject, renameTag, refreshAllTags, getAllTagUsageCounts, getCachedTags, ensureTagsLoaded, tagsVersion };
}
