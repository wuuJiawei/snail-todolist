import React, { useEffect, useMemo, useState } from "react";
import { useTaskContext } from "@/contexts/task";
import { Tag } from "@/types/tag";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { X } from "lucide-react";

interface TagSelectorProps {
  taskId: string;
  projectId?: string | null;
  readOnly?: boolean;
  inline?: boolean; // 内联模式：直接展示搜索与列表，而不是通过弹出层
}

const TagSelector: React.FC<TagSelectorProps> = ({ taskId, projectId, readOnly = false, inline = false }) => {
  const { getTaskTags, listAllTags, attachTagToTask, detachTagFromTask, createTag } = useTaskContext();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const filteredTags = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return availableTags;
    return availableTags.filter(t => t.name.toLowerCase().includes(q));
  }, [availableTags, query]);

  const selected = getTaskTags(taskId);
  const selectedIds = useMemo(() => new Set(selected.map(t => t.id)), [selected]);

  const refreshAvailableTags = async () => {
    const tags = await listAllTags(projectId ?? undefined);
    setAvailableTags(tags);
  };

  // 非内联（Popover）时：打开时加载
  useEffect(() => {
    if (open && !inline) {
      refreshAvailableTags();
    }
  }, [open, inline, listAllTags, projectId]);

  // 内联模式：挂载或 projectId 变化时加载
  useEffect(() => {
    if (inline) {
      refreshAvailableTags();
    }
  }, [inline, projectId]);

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
    const created = await createTag(trimmed, projectId ?? undefined);
    // 无论创建成功还是已存在，都刷新一次标签列表
    await refreshAvailableTags();
    // 尝试找到同名标签并关联
    const found = (await listAllTags(projectId ?? undefined)).find(t => t.name.toLowerCase() === trimmed.toLowerCase());
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
          <CommandEmpty>
            无结果，按 Enter 创建
            <div className="mt-2" />
          </CommandEmpty>
          <CommandGroup heading="我的标签">
            {filteredTags.map(tag => (
              <CommandItem key={tag.id} value={tag.name} onSelect={() => handleToggle(tag)}>
                <span className="mr-2 text-xs opacity-60">{selectedIds.has(tag.id) ? "✓" : ""}</span>
                {tag.name}
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


