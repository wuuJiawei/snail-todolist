import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTaskContext } from "@/contexts/task";
import { Tag } from "@/types/tag";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Globe, X, Trash } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useProjectContext } from "@/contexts/ProjectContext";
import { Skeleton } from "@/components/ui/skeleton";

interface TagSelectorProps {
  taskId: string;
  projectId?: string | null;
  readOnly?: boolean;
  inline?: boolean; // 内联模式：直接展示搜索与列表，而不是通过弹出层
}

const TagSelector: React.FC<TagSelectorProps> = ({ taskId, projectId, readOnly = false, inline = false }) => {
  const { getTaskTags, listAllTags, attachTagToTask, detachTagFromTask, createTag, deleteTagPermanently, getCachedTags, ensureTagsLoaded, tagsVersion, getAllTagUsageCounts } = useTaskContext();
  const { projects } = useProjectContext();
  const usageCounts = getAllTagUsageCounts();
  const [confirmOpenForTagId, setConfirmOpenForTagId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);

  // Filter tags based on project scope
  // Tags are visible if:
  // 1. They are global (project_id is null)
  // 2. They belong to the current project
  const filteredTags = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = availableTags.filter(tag => 
      // Filter by project scope
      (tag.project_id === null || tag.project_id === projectId) &&
      // Filter by search query if present
      (!q || tag.name.toLowerCase().includes(q))
    );
    return filtered;
  }, [availableTags, query, projectId]);

  const selected = getTaskTags(taskId);
  const selectedIds = useMemo(() => new Set(selected.map(t => t.id)), [selected]);

  const refreshAvailableTags = useCallback(async () => {
    setLoading(true);
    try {
      // 首先尝试使用缓存数据
      const cachedTags = getCachedTags(projectId);
      if (cachedTags && cachedTags.length > 0) {
        setAvailableTags(cachedTags);
        setLoading(false);
        return;
      }
      
      // 如果缓存中没有，则加载
      await ensureTagsLoaded(projectId);
      const tags = getCachedTags(projectId);
      setAvailableTags(tags);
    } catch (error) {
      console.error("Error loading tags:", error);
    } finally {
      setLoading(false);
    }
  }, [getCachedTags, ensureTagsLoaded, projectId]);

  // 非内联（Popover）时：打开时加载
  useEffect(() => {
    if (open && !inline) {
      refreshAvailableTags();
    }
  }, [open, inline, refreshAvailableTags]);

  // 内联模式：挂载或 projectId 变化时加载
  useEffect(() => {
    if (inline) {
      refreshAvailableTags();
    }
  }, [inline, projectId, refreshAvailableTags]);

  // 监听缓存版本变化，保持本地列表同步
  useEffect(() => {
    refreshAvailableTags();
  }, [tagsVersion, refreshAvailableTags]);

  const handleToggle = async (tag: Tag) => {
    if (readOnly) return;
    if (selectedIds.has(tag.id)) {
      await detachTagFromTask(taskId, tag.id);
    } else {
      await attachTagToTask(taskId, tag.id);
    }
  };

  const handleCreate = async (name: string) => {
    if (readOnly) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    
    // Create tag with current project scope
    const created = await createTag(trimmed, projectId);
    
    // 创建后直接从缓存获取刷新列表
    refreshAvailableTags();
    
    // 尝试找到同名标签并关联
    if (created) {
      await attachTagToTask(taskId, created.id);
    } else {
      // 如果没创建成功（可能是已存在），尝试查找同名标签
      const cachedTags = getCachedTags(projectId);
      const found = cachedTags.find(t => t.name.toLowerCase() === trimmed.toLowerCase());
      if (found) {
        await attachTagToTask(taskId, found.id);
      }
    }
    
    // 清空输入框
    setQuery("");
  };
  
  const getProjectName = (tag: Tag) => {
    if (tag.project_id === null) return null;
    const project = projects.find(p => p.id === tag.project_id);
    return project?.name;
  };

  const selectorBody = (
    <>
      <Command>
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder="搜索或创建标签"
          onKeyDown={async (e) => {
            if (e.key === 'Enter') {
              const name = query.trim();
              if (!name) return;
              const exists = availableTags.some(t => t.name.toLowerCase() === name.toLowerCase());
              if (!exists) {
                await handleCreate(name);
              }
            }
          }}
        />
        <CommandList>
          {loading && (
            <div className="px-2 py-3 flex flex-col space-y-2">
              {Array(3).fill(0).map((_, index) => (
                <div key={index} className="flex items-center px-2">
                  <Skeleton className="h-3 w-3 mr-2 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          )}
          <CommandEmpty>
            无结果，按 Enter 创建
            <div className="mt-2" />
          </CommandEmpty>
          <CommandGroup heading="我的标签">
            {filteredTags.map(tag => (
              <CommandItem key={tag.id} value={tag.name} onSelect={() => handleToggle(tag)} className="flex items-center">
                <span className="mr-2 text-xs opacity-60">{selectedIds.has(tag.id) ? "✓" : ""}</span>
                <span className="flex-1 flex items-center">
                  {tag.name}
                  {tag.project_id === null && (
                    <Globe className="ml-2 h-3 w-3 text-muted-foreground" aria-label="全局可见" />
                  )}
                </span>
                {!readOnly && (
                  <AlertDialog open={confirmOpenForTagId === tag.id} onOpenChange={(o) => setConfirmOpenForTagId(o ? tag.id : null)}>
                    <AlertDialogTrigger asChild>
                      <button className="ml-2 p-1 rounded hover:bg-muted" onClick={(e) => { e.stopPropagation(); }}>
                        <Trash className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>删除标签？</AlertDialogTitle>
                        <AlertDialogDescription>
                          {usageCounts[tag.id] && usageCounts[tag.id] > 0
                            ? `该标签正在被 ${usageCounts[tag.id]} 个任务使用。是否强制删除？此操作会从所有相关任务中移除该标签。`
                            : "此操作将删除该标签，是否继续？"}
                          {tag.project_id === null && (
                            <div className="mt-2 text-amber-500">
                              此为全局标签，删除后将影响所有项目。
                            </div>
                          )}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={async () => {
                          const ok = await deleteTagPermanently(tag.id);
                          if (ok) {
                            await refreshAvailableTags();
                          }
                        }}>删除</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
      {query.trim() && (
        <div className="border-t p-2">
          <Button size="sm" className="w-full" onClick={() => handleCreate(query)}>
            创建标签
            <span className="text-xs ml-1 opacity-70">
              ({projectId ? "项目内" : "全局"})
            </span>
          </Button>
        </div>
      )}
    </>
  );

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {selected.map(tag => (
        <Badge 
          key={tag.id} 
          variant="secondary" 
          className="px-2 py-0.5 flex items-center"
        >
          <span>{tag.name}</span>
          {tag.project_id === null && (
            <Globe className="ml-1 h-3 w-3 opacity-60" aria-label="全局可见" />
          )}
          {!readOnly && (
            <button className="ml-1 inline-flex" onClick={() => detachTagFromTask(taskId, tag.id)} aria-label="remove tag">
              <X className="h-3 w-3 opacity-60" />
            </button>
          )}
        </Badge>
      ))}
      {!readOnly && (
        inline ? (
          <div className="w-full mt-2 border rounded-md overflow-hidden">
            {selectorBody}
          </div>
        ) : (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2">+ 标签</Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-64" align="start">
              {selectorBody}
            </PopoverContent>
          </Popover>
        )
      )}
    </div>
  );
};

export default TagSelector;


