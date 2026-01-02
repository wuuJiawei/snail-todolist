import { Calendar as CalendarIcon, Copy, MoreHorizontal, X, History, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Icon } from "@/components/ui/icon-park";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import DueDatePickerContent from "./DueDatePickerContent";
import { formatDateText } from "@/utils/taskUtils";
import React from "react";
import { cn } from "@/lib/utils";

export interface TaskDetailHeaderProps {
  completed: boolean;
  flagged: boolean;
  isTaskInTrash: boolean;
  selectedDate: Date | undefined;
  onCompletedChange: (checked: boolean | "indeterminate") => void;
  onFlagToggle: () => void;
  onDateChange: (date: Date | undefined) => void;
  onCopyAsMarkdown: () => void;
  onClose: () => void;
  onShowActivityLog: () => void;
  isCompletionLoading: boolean;
}

const TaskDetailHeader: React.FC<TaskDetailHeaderProps> = ({
  completed,
  flagged,
  isTaskInTrash,
  selectedDate,
  onCompletedChange,
  onFlagToggle,
  onDateChange,
  onCopyAsMarkdown,
  onClose,
  onShowActivityLog,
  isCompletionLoading,
}) => {
  return (
    <div className="p-3 flex items-center justify-between border-b bg-background">
      <div className="flex items-center gap-2">
        {isCompletionLoading && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
        <Checkbox
          checked={completed}
          onCheckedChange={onCompletedChange}
          className="rounded-full h-5 w-5"
          disabled={isTaskInTrash || isCompletionLoading}
        />
        <button
          onClick={onFlagToggle}
          disabled={isTaskInTrash || isCompletionLoading}
          className={cn(
            "h-5 w-5 rounded-full border flex items-center justify-center transition-colors",
            "disabled:cursor-not-allowed disabled:opacity-50",
            flagged 
              ? "border-rose-700 bg-rose-700 text-white" 
              : "border-primary text-primary hover:bg-primary/10"
          )}
          aria-pressed={flagged}
          title={flagged ? "取消标记" : "标记任务"}
        >
          <Icon icon="flag" size="12" className="h-3 w-3" />
        </button>
        <Separator orientation="vertical" className="h-5" />
        {isTaskInTrash ? (
          <div className="text-xs px-2 py-1 bg-muted rounded-md flex items-center">
            <CalendarIcon className="mr-2 h-3 w-3" />
            {selectedDate ? formatDateText(selectedDate) : "无截止日期"}
          </div>
        ) : (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs h-7" disabled={isCompletionLoading}>
                <CalendarIcon className="mr-2 h-3 w-3" />
                {selectedDate ? formatDateText(selectedDate) : "添加截止日期"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <DueDatePickerContent
                selectedDate={selectedDate}
                onChange={onDateChange}
                removeLabel="移除截止日期"
              />
            </PopoverContent>
          </Popover>
        )}
      </div>
      <div className="flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onShowActivityLog}>
              <History className="mr-2 h-4 w-4" />
              查看任务动态
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onCopyAsMarkdown}>
              <Copy className="mr-2 h-4 w-4" />
              复制为 Markdown
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default TaskDetailHeader;
