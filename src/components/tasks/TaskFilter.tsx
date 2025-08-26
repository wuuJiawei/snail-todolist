import React, { useState, useEffect, useMemo } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Icon } from "@/components/ui/icon-park";
import { useTaskContext } from "@/contexts/task";

export interface TaskFilterOptions {
  status: string[];
  deadline: string[];
  hasAttachments: boolean | null;
  tags?: string[];
}

export interface TaskFilterProps {
  filters: TaskFilterOptions;
  onFiltersChange: (filters: TaskFilterOptions) => void;
  activeCount: number;
}

const TaskFilter: React.FC<TaskFilterProps> = ({
  filters,
  onFiltersChange,
  activeCount,
}) => {
  const [open, setOpen] = useState(false);
  const { listAllTags, getAllTagUsageCounts, getCachedTags, ensureTagsLoaded, tagsVersion } = useTaskContext();
  const [allTags, setAllTags] = useState<{ id: string; name: string }[]>([]);
  const usageCounts = getAllTagUsageCounts();

  const syncTags = async () => {
    const cached = getCachedTags();
    if (cached.length === 0) await ensureTagsLoaded();
    const current = getCachedTags();
    setAllTags(current.map(t => ({ id: t.id, name: t.name })));
  };

  useEffect(() => {
    syncTags();
  }, []);

  useEffect(() => {
    syncTags();
  }, [tagsVersion]);

  const handleStatusChange = (status: string, checked: boolean) => {
    const newStatus = checked
      ? [...filters.status, status]
      : filters.status.filter((s) => s !== status);
    
    onFiltersChange({
      ...filters,
      status: newStatus,
    });
  };

  const handleDeadlineChange = (deadline: string, checked: boolean) => {
    const newDeadline = checked
      ? [...filters.deadline, deadline]
      : filters.deadline.filter((d) => d !== deadline);
    
    onFiltersChange({
      ...filters,
      deadline: newDeadline,
    });
  };

  const handleAttachmentsChange = (value: boolean | null) => {
    onFiltersChange({
      ...filters,
      hasAttachments: value,
    });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      status: [],
      deadline: [],
      hasAttachments: null,
      tags: [],
    });
  };

  const hasActiveFilters = 
    filters.status.length > 0 ||
    filters.deadline.length > 0 ||
    filters.hasAttachments !== null ||
    (filters.tags && filters.tags.length > 0);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 relative"
        >
          <Icon icon="filter" size="16" className="h-4 w-4" />
          {activeCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">筛选任务</h4>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground"
                onClick={clearAllFilters}
              >
                清除
              </Button>
            )}
          </div>

          <Separator />

          {/* 任务状态 */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">任务状态</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="pending"
                  checked={filters.status.includes("pending")}
                  onCheckedChange={(checked) =>
                    handleStatusChange("pending", checked as boolean)
                  }
                />
                <Label htmlFor="pending" className="text-sm">
                  待办
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="completed"
                  checked={filters.status.includes("completed")}
                  onCheckedChange={(checked) =>
                    handleStatusChange("completed", checked as boolean)
                  }
                />
                <Label htmlFor="completed" className="text-sm">
                  已完成
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="abandoned"
                  checked={filters.status.includes("abandoned")}
                  onCheckedChange={(checked) =>
                    handleStatusChange("abandoned", checked as boolean)
                  }
                />
                <Label htmlFor="abandoned" className="text-sm">
                  已放弃
                </Label>
              </div>
            </div>
          </div>

          <Separator />

          {/* 截止时间 */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">截止时间</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="overdue"
                  checked={filters.deadline.includes("overdue")}
                  onCheckedChange={(checked) =>
                    handleDeadlineChange("overdue", checked as boolean)
                  }
                />
                <Label htmlFor="overdue" className="text-sm">
                  逾期
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="today"
                  checked={filters.deadline.includes("today")}
                  onCheckedChange={(checked) =>
                    handleDeadlineChange("today", checked as boolean)
                  }
                />
                <Label htmlFor="today" className="text-sm">
                  今日截止
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="week"
                  checked={filters.deadline.includes("week")}
                  onCheckedChange={(checked) =>
                    handleDeadlineChange("week", checked as boolean)
                  }
                />
                <Label htmlFor="week" className="text-sm">
                  本周截止
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="no-date"
                  checked={filters.deadline.includes("no-date")}
                  onCheckedChange={(checked) =>
                    handleDeadlineChange("no-date", checked as boolean)
                  }
                />
                <Label htmlFor="no-date" className="text-sm">
                  无截止时间
                </Label>
              </div>
            </div>
          </div>

          <Separator />

          {/* 附件 */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">附件</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="has-attachments"
                  checked={filters.hasAttachments === true}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      handleAttachmentsChange(true);
                    } else if (filters.hasAttachments === true) {
                      handleAttachmentsChange(null);
                    }
                  }}
                />
                <Label htmlFor="has-attachments" className="text-sm">
                  有附件
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="no-attachments"
                  checked={filters.hasAttachments === false}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      handleAttachmentsChange(false);
                    } else if (filters.hasAttachments === false) {
                      handleAttachmentsChange(null);
                    }
                  }}
                />
                <Label htmlFor="no-attachments" className="text-sm">
                  无附件
                </Label>
              </div>
            </div>
          </div>

          <Separator />

          {/* 标签 */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">标签</Label>
            <div className="space-y-1 max-h-40 overflow-y-auto pr-1 custom-scrollbar-thin">
              {allTags.map(t => {
                const checked = (filters.tags || []).includes(t.id);
                return (
                  <div key={t.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`tag-${t.id}`}
                      checked={checked}
                      onCheckedChange={(isChecked) => {
                        const next = new Set(filters.tags || []);
                        if (isChecked) next.add(t.id); else next.delete(t.id);
                        onFiltersChange({ ...filters, tags: Array.from(next) });
                      }}
                    />
                    <Label htmlFor={`tag-${t.id}`} className="text-sm">{t.name}
                      <span className="ml-1 text-xs text-muted-foreground">({usageCounts[t.id] || 0})</span>
                    </Label>
                  </div>
                );
              })}
              {allTags.length === 0 && (
                <div className="text-xs text-muted-foreground">暂无标签</div>
              )}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default TaskFilter;