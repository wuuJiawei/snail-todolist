import React, { useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface TaskSearchProps {
  value: string;
  open: boolean;
  onChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onClear: () => void;
}

const TaskSearch: React.FC<TaskSearchProps> = ({
  value,
  open,
  onChange,
  onOpenChange,
  onClear,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  const closeAndClear = () => {
    onClear();
    onOpenChange(false);
  };

  if (!open) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => onOpenChange(true)}
        aria-label="搜索当前清单任务"
        title="搜索当前清单任务"
      >
        <Search className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <div
      className={cn(
        "flex h-8 w-56 items-center rounded-md border border-input bg-background shadow-sm",
        "animate-in fade-in-0 slide-in-from-right-1 duration-150",
      )}
    >
      <Search className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
      <Input
        ref={inputRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            closeAndClear();
          }
        }}
        placeholder="搜索当前清单"
        aria-label="搜索当前清单任务"
        className="h-7 min-w-0 flex-1 border-0 bg-transparent px-2 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
      />
      <Button
        variant="ghost"
        size="sm"
        className="mr-0.5 h-7 w-7 shrink-0 p-0 text-muted-foreground hover:text-foreground"
        onClick={closeAndClear}
        aria-label="清空搜索"
        title="清空搜索"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
};

export default TaskSearch;
