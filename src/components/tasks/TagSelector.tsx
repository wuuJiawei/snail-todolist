import React, { useEffect, useMemo, useState } from "react";
import { useTaskContext } from "@/contexts/task";
import { Tag } from "@/types/tag";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { X, Trash } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface TagSelectorProps {
  taskId: string;
  projectId?: string | null;
  readOnly?: boolean;
  inline?: boolean; // 内联模式：直接展示搜索与列表，而不是通过弹出层
}

const TagSelector: React.FC<TagSelectorProps> = ({ taskId, projectId, readOnly = false, inline = false }) => {
  const { getTaskTags, listAllTags, attachTagToTask, detachTagFromTask, createTag, deleteTagPermanently, getCachedTags, ensureTagsLoaded, tagsVersion, getAllTagUsageCounts } = useTaskContext();
  const usageCounts = getAllTagUsageCounts();
  const [confirmOpenForTagId, setConfirmOpenForTagId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);

  const filteredTags = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return availableTags;
    return availableTags.filter(t => t.name.toLowerCase().includes(q));
  }, [availableTags, query]);

  const selected = getTaskTags(taskId);
  const selectedIds = useMemo(() => new Set(selected.map(t => t.id)), [selected]);

  const refreshAvailableTags = async () => {
    setLoading(true);
    // 优先用缓存，必要时加载
    const cached = getCachedTags();
    if (cached.length === 0) await ensureTagsLoaded();
    const current = getCachedTags();
    setAvailableTags(current);
    setLoading(false);
  };

  // 非内联（Popover）时：打开时加载
  useEffect(() => {
    if (open && !inline) {
      refreshAvailableTags();
    }
  }, [open, inline]);

  // 内联模式：挂载或 projectId 变化时加载
  useEffect(() => {
    if (inline) {
      refreshAvailableTags();
    }
  }, [inline]);

  // 监听缓存版本变化，保持本地列表同步
  useEffect(() => {
    refreshAvailableTags();
  }, [tagsVersion]);

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
    const created = await createTag(trimmed);
    // 无论创建成功还是已存在，都刷新一次标签列表
    await refreshAvailableTags();
    // 尝试找到同名标签并关联
    const found = (await listAllTags()).find(t => t.name.toLowerCase() === trimmed.toLowerCase());
    if (found) {
      await attachTagToTask(taskId, found.id);
    }
    // 清空输入框
    setQuery("");
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
            <div className="py-3 px-3 text-xs text-muted-foreground">正在加载标签…</div>
          )}
          <CommandEmpty>
            无结果，按 Enter 创建
            <div className="mt-2" />
          </CommandEmpty>
          <CommandGroup heading="我的标签">
            {filteredTags.map(tag => (
              <CommandItem key={tag.id} value={tag.name} onSelect={() => handleToggle(tag)} className="flex items-center">
                <span className="mr-2 text-xs opacity-60">{selectedIds.has(tag.id) ? "✓" : ""}</span>
                <span className="flex-1">{tag.name}</span>
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
          <Button size="sm" className="w-full" onClick={() => handleCreate(query)}>创建标签</Button>
        </div>
      )}
    </>
  );

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {selected.map(tag => (
        <Badge key={tag.id} variant="secondary" className="px-2 py-0.5">
          <span>{tag.name}</span>
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


