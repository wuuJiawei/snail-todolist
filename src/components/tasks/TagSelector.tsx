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
}

const TagSelector: React.FC<TagSelectorProps> = ({ taskId, projectId, readOnly = false }) => {
  const { getTaskTags, listAllTags, attachTagToTask, detachTagFromTask, createTag } = useTaskContext();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);

  const selected = getTaskTags(taskId);
  const selectedIds = useMemo(() => new Set(selected.map(t => t.id)), [selected]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const tags = await listAllTags(projectId ?? undefined);
      setAvailableTags(tags);
    })();
  }, [open, listAllTags, projectId]);

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
    const tag = await createTag(trimmed, projectId ?? undefined);
    if (tag) {
      await attachTagToTask(taskId, tag.id);
      setOpen(false);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* selected tags */}
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
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2">+ 标签</Button>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-64" align="start">
            <Command>
              <CommandInput value={query} onValueChange={setQuery} placeholder="搜索或创建标签" />
              <CommandList>
                <CommandEmpty>
                  无结果，按 Enter 创建「{query}」
                  <div className="mt-2" />
                </CommandEmpty>
                <CommandGroup heading="我的标签">
                  {availableTags.map(tag => (
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
                <Button size="sm" className="w-full" onClick={() => handleCreate(query)}>创建标签「{query}」</Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};

export default TagSelector;


