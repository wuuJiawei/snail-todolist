import React, { useEffect } from "react";
import { Calendar as CalendarIcon, Copy, MoreHorizontal, X, History, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon-park";
import { cn } from "@/lib/utils";
import { formatDateText } from "@/utils/taskUtils";
import TagSelector from "./TagSelector";
import DueDatePickerContent from "./DueDatePickerContent";
import type { Task } from "@/types/task";

export interface TaskDetailTitleSectionProps {
  title: string;
  titleRef: React.RefObject<HTMLTextAreaElement>;
  isTaskInTrash: boolean;
  onTitleChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onCompositionStart: () => void;
  onCompositionEnd: (event: React.CompositionEvent<HTMLTextAreaElement>) => void;
  selectedTask: Task;
  completedAtLabel: string;
  deletedAtLabel: string;
  completed: boolean;
  flagged: boolean;
  selectedDate: Date | undefined;
  isCompletionLoading: boolean;
  onCompletedChange: (checked: boolean | "indeterminate") => void;
  onFlagToggle: () => void;
  onDateChange: (date: Date | undefined) => void;
  onCopyAsMarkdown: () => void;
  onClose: () => void;
  onShowActivityLog: () => void;
}

const TaskDetailTitleSection: React.FC<TaskDetailTitleSectionProps> = ({
  title,
  titleRef,
  isTaskInTrash,
  onTitleChange,
  onCompositionStart,
  onCompositionEnd,
  selectedTask,
  completedAtLabel,
  deletedAtLabel,
  completed,
  flagged,
  selectedDate,
  isCompletionLoading,
  onCompletedChange,
  onFlagToggle,
  onDateChange,
  onCopyAsMarkdown,
  onClose,
  onShowActivityLog,
}) => {
  useEffect(() => {
    if (titleRef.current) {
      const el = titleRef.current;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [title, titleRef]);

  return (
    <div className="flex flex-col gap-4">
      {/* 标题行：勾选框 + 标题 + 操作按钮 */}
      <div className="flex items-start gap-3">
        {/* 勾选框 */}
        <div className="pt-1 flex-shrink-0">
          {isCompletionLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <Checkbox
              checked={completed}
              onCheckedChange={onCompletedChange}
              className="rounded-full h-5 w-5"
              disabled={isTaskInTrash}
            />
          )}
        </div>

        {/* 标题 */}
        <div className="flex-1 min-w-0">
          {isTaskInTrash ? (
            <div className="text-lg font-semibold leading-tight py-0.5">
              {title}
            </div>
          ) : (
            <Textarea
              ref={titleRef}
              value={title}
              onChange={onTitleChange}
              onCompositionStart={onCompositionStart}
              onCompositionEnd={onCompositionEnd}
              className="w-full border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-lg font-semibold px-0 py-0.5 min-h-0 resize-none overflow-hidden bg-transparent leading-tight"
              placeholder="任务标题"
              disabled={isCompletionLoading}
              onInput={(event) => {
                const target = event.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = `${target.scrollHeight}px`;
              }}
            />
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
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
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground" 
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 元信息行：日期 + 标记 + 标签 */}
      <div className="flex flex-wrap items-center gap-2 pl-8">
        {/* 截止日期 */}
        {isTaskInTrash ? (
          selectedDate && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <CalendarIcon className="h-3 w-3" />
              {formatDateText(selectedDate)}
            </span>
          )
        ) : (
          <Popover>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "text-xs flex items-center gap-1 px-2 py-1 rounded-md transition-colors",
                  selectedDate 
                    ? "text-foreground bg-muted hover:bg-muted/80" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
                disabled={isCompletionLoading}
              >
                <CalendarIcon className="h-3 w-3" />
                {selectedDate ? formatDateText(selectedDate) : "截止日期"}
              </button>
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

        {/* 标记按钮 */}
        {!isTaskInTrash && (
          <button
            onClick={onFlagToggle}
            disabled={isCompletionLoading}
            className={cn(
              "text-xs flex items-center gap-1 px-2 py-1 rounded-md transition-colors",
              "disabled:cursor-not-allowed disabled:opacity-50",
              flagged 
                ? "text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/20 dark:hover:bg-rose-900/30" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
            title={flagged ? "取消标记" : "标记任务"}
          >
            <Icon icon="flag" size="12" className="h-3 w-3" />
            {flagged ? "已标记" : "标记"}
          </button>
        )}

        {/* 已标记状态（回收站中显示） */}
        {isTaskInTrash && flagged && (
          <span className="text-xs text-rose-700 flex items-center gap-1 px-2 py-1 rounded-md bg-rose-50 dark:bg-rose-900/20">
            <Icon icon="flag" size="12" className="h-3 w-3" />
            已标记
          </span>
        )}

        {/* 分隔符 */}
        {(selectedDate || flagged || !isTaskInTrash) && (
          <span className="text-border">|</span>
        )}

        {/* 标签 */}
        <TagSelector 
          taskId={selectedTask.id} 
          projectId={selectedTask.project ?? null} 
          readOnly={isTaskInTrash} 
        />
      </div>

      {/* 状态信息 */}
      {(completedAtLabel || deletedAtLabel) && (
        <div className="text-xs text-muted-foreground pl-8 space-y-0.5">
          {completedAtLabel && <div>{completedAtLabel}</div>}
          {deletedAtLabel && <div className="text-amber-600">{deletedAtLabel}</div>}
        </div>
      )}
    </div>
  );
};

export default TaskDetailTitleSection;
