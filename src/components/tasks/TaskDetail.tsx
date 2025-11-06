import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from "react";
import { useTaskContext } from "@/contexts/task";
import { TaskAttachment } from "@/types/task";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Calendar as CalendarIcon, X, MoreHorizontal, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import DueDatePickerContent from "./DueDatePickerContent";
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
import { format, parseISO, isValid } from "date-fns";
import { zhCN } from "date-fns/locale";
import { formatDateText } from "@/utils/taskUtils";
import VditorEditor from "./VditorEditor";
import TagSelector from "./TagSelector";
import TaskAttachments from "./TaskAttachments";
import { useDebouncedCallback } from 'use-debounce';

const TaskDetail = () => {
  const { selectedTask, updateTask, selectTask, trashedTasks } = useTaskContext();
  const { toast } = useToast();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [completed, setCompleted] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [editorContent, setEditorContent] = useState("");
  const [isEditorUpdating, setIsEditorUpdating] = useState(false);
  const [blockNoteEditor, setBlockNoteEditor] = useState<any>(null);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);

  // Track task switching with a ref to avoid unnecessary re-renders
  const previousTaskIdRef = useRef<string | null>(null);
  
  // 关键修复：追踪当前正在编辑的任务ID，防止竞态条件
  const currentEditingTaskIdRef = useRef<string | null>(null);
  
  // Add refs to track user input state
  const isUserTypingRef = useRef(false);
  const lastUserInputTimeRef = useRef<number>(0);
  const userInputTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if the selected task is in the trash
  const isTaskInTrash = selectedTask ? trashedTasks.some(task => task.id === selectedTask.id) : false;

  // Reference to the title textarea element
  const titleTextareaRef = useRef<HTMLTextAreaElement>(null);
  const cursorPosRef = useRef<{ start: number | null; end: number | null }>({ start: null, end: null });
  const shouldRestoreCursorRef = useRef(false);

  // IME composition state for title input
  const [isTitleComposing, setIsTitleComposing] = useState(false);

  useEffect(() => {
    if (selectedTask) {
      // Check if this is a new task selection
      const isNewTaskSelection = previousTaskIdRef.current !== selectedTask.id;
      
      // 关键修复：在任务切换前，强制刷新pending的debounced save
      if (isNewTaskSelection && previousTaskIdRef.current !== null) {
        // 立即执行pending的保存操作，防止快速切换导致内容丢失
        debouncedTitleSave.flush();
        debouncedContentSave.flush();
      }
      
      previousTaskIdRef.current = selectedTask.id;

      // 关键修复：更新当前正在编辑的任务ID
      if (isNewTaskSelection) {
        currentEditingTaskIdRef.current = selectedTask.id;
      }

      // Only update title if it's a new task selection AND user is not currently typing
      if (isNewTaskSelection && !isUserTypingRef.current) {
        setTitle(selectedTask.title);
      }
      
      // Always update completed state
      setCompleted(selectedTask.completed);

      // Handle editor content update with task switching flag
      if (isNewTaskSelection) {
        setIsEditorUpdating(true);

        // Update editor content
        setEditorContent(selectedTask.description || '');

        // Update attachments
        setAttachments(selectedTask.attachments || []);

        // Handle date parsing
        setSelectedDate(undefined);
        if (selectedTask.date) {
          try {
            const date = parseISO(selectedTask.date);
            if (isValid(date)) {
              setSelectedDate(date);
            } else {
              console.error('Invalid date:', selectedTask.date);
            }
          } catch (error) {
            console.error('Error parsing date:', error);
          }
        }

        // Reset textarea height when switching tasks
        if (titleTextareaRef.current) {
          // Defer height adjustment to ensure DOM is updated with new title
          requestAnimationFrame(() => {
            if (titleTextareaRef.current) { // Check ref again as component might unmount
              titleTextareaRef.current.style.height = 'auto';
              titleTextareaRef.current.style.height = `${titleTextareaRef.current.scrollHeight}px`;
            }
          });
        }

        // 关键修复：延长保护期从100ms到300ms，确保编辑器完全初始化
        setTimeout(() => {
          setIsEditorUpdating(false);
        }, 300);
      }
    }
  }, [selectedTask]);

  // Sync attachments when selectedTask updates (e.g., after save)
  useEffect(() => {
    if (selectedTask && !isUserTypingRef.current) {
      setAttachments(selectedTask.attachments || []);
    }
  }, [selectedTask?.attachments]);

  const saveTask = useCallback(async (updates: Partial<typeof selectedTask>, taskIdToSave?: string) => {
    if (!selectedTask) return;

    // 关键修复：验证当前正在编辑的任务ID，防止竞态条件
    const targetTaskId = taskIdToSave || selectedTask.id;
    if (currentEditingTaskIdRef.current && currentEditingTaskIdRef.current !== targetTaskId) {
      console.warn(`任务切换竞态条件：尝试保存到任务 ${targetTaskId}，但当前编辑的是 ${currentEditingTaskIdRef.current}，忽略此次保存`);
      return;
    }

    try {
      await updateTask(targetTaskId, updates);
    } catch (error) {
      console.error("Failed to save task", error);
      toast({
        title: "保存失败",
        description: "无法保存任务更新",
        variant: "destructive",
      });
    }
  }, [selectedTask, updateTask, toast]);

  // 更细粒度的防抖：标题与正文分别处理
  const debouncedTitleSave = useDebouncedCallback(
    (title: string, taskId?: string) => {
      saveTask({ title }, taskId);
    },
    350,
    { maxWait: 1200 }
  );

  const debouncedContentSave = useDebouncedCallback(
    (content: string, taskId?: string) => {
      saveTask({ description: content }, taskId);
    },
    600,
    { maxWait: 2000 }
  );

  const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newTitle = e.target.value;
    
    // Mark user as typing and record input time
    isUserTypingRef.current = true;
    lastUserInputTimeRef.current = Date.now();
    shouldRestoreCursorRef.current = true;
    
    // Store cursor position before state update
    cursorPosRef.current = { start: e.target.selectionStart, end: e.target.selectionEnd };
    
    setTitle(newTitle);
    
    // During IME composition, don't save immediately
    if (!isTitleComposing) {
      if (selectedTask) {
        debouncedTitleSave(newTitle, selectedTask.id);
      }
    }
    
    // Clear existing timeout and set new one to mark end of typing
    if (userInputTimeoutRef.current) {
      clearTimeout(userInputTimeoutRef.current);
    }
    
    userInputTimeoutRef.current = setTimeout(() => {
      isUserTypingRef.current = false;
      shouldRestoreCursorRef.current = false;
    }, 1000); // User considered done typing after 1 second of inactivity
  };

  // Handle IME composition events for title
  const handleTitleCompositionStart = () => {
    setIsTitleComposing(true);
  };

  const handleTitleCompositionEnd = (e: React.CompositionEvent<HTMLTextAreaElement>) => {
    setIsTitleComposing(false);
    const newTitle = e.currentTarget.value;
    
    // Save the final title when composition ends
    if (selectedTask) {
      debouncedTitleSave(newTitle, selectedTask.id);
    }
  };

  const handleCompletedChange = (checked: boolean | 'indeterminate') => {
    const newCompleted = checked === true;
    setCompleted(newCompleted);
    saveTask({ completed: newCompleted });
  };

  const handleDateChange = (date: Date | undefined) => {
    setSelectedDate(date);
    let dateString;
    if (date) {
      const normalizedDate = new Date(date);
      normalizedDate.setHours(0, 0, 0, 0);
      dateString = normalizedDate.toISOString();
    }
    saveTask({ date: dateString });
  };

  useLayoutEffect(() => {
    // Only restore cursor position if it was set by user input and we should restore it
    if (titleTextareaRef.current && 
        cursorPosRef.current.start !== null && 
        cursorPosRef.current.end !== null && 
        shouldRestoreCursorRef.current) {
      
      const titleLength = titleTextareaRef.current.value.length;
      const start = Math.min(cursorPosRef.current.start, titleLength);
      const end = Math.min(cursorPosRef.current.end, titleLength);

      titleTextareaRef.current.selectionStart = start;
      titleTextareaRef.current.selectionEnd = end;
      
      // Reset cursorPosRef after applying it
      cursorPosRef.current = { start: null, end: null };
    }
  }, [title]);

  const handleEditorChange = (content: string) => {
    // Only update if we have a selected task to prevent overwrites during transitions
    if (selectedTask && !isEditorUpdating) {
      // 关键修复：验证当前编辑的任务ID是否匹配
      if (currentEditingTaskIdRef.current !== selectedTask.id) {
        console.warn(`编辑器内容变化但任务ID不匹配：当前编辑=${currentEditingTaskIdRef.current}，selectedTask=${selectedTask.id}，忽略此次变化`);
        return;
      }

      // Update local state immediately to prevent flickering
      setEditorContent(content);

      // Debounce the actual save operation，传入当前任务ID
      debouncedContentSave(content, selectedTask.id);
    }
  };

  const handleClose = () => {
    debouncedTitleSave.flush();
    debouncedContentSave.flush();
    selectTask(null);
  };

  const handleCopyAsMarkdown = async () => {
    if (!selectedTask || !blockNoteEditor) return;
    
    try {
      // Convert task title and content to markdown
      const title = selectedTask.title || '';
      
      let markdown = '';
      
      // Add title as h1 if it exists
      if (title) {
        markdown += `# ${title}\n\n`;
      }
      
      // Use BlockNote's official API to convert content to markdown
      const contentMarkdown = await blockNoteEditor.blocksToMarkdownLossy();
      if (contentMarkdown) {
        markdown += contentMarkdown;
      }
      
      // Copy to clipboard
      await navigator.clipboard.writeText(markdown);
      
      toast({
        title: "复制成功",
        description: "任务内容已复制为 Markdown 格式",
      });
    } catch (error) {
      console.error('Error copying markdown:', error);
      toast({
        title: "复制失败",
        description: "无法复制任务内容",
        variant: "destructive",
      });
    }
  };

  

  const formatCompletedAt = () => {
    if (!selectedTask?.completed_at) return "";
    try {
      const date = parseISO(selectedTask.completed_at);
      if (!isValid(date)) return "";
      return `完成于: ${format(date, "yyyy年M月d日 HH:mm", { locale: zhCN })}`;
    } catch (error) {
      console.error('Error parsing completed_at date:', error);
      return "";
    }
  };

  const formatDeletedAt = () => {
    if (!selectedTask?.deleted_at) return "";
    try {
      const date = parseISO(selectedTask.deleted_at);
      if (!isValid(date)) return "";
      return `删除于: ${format(date, "yyyy年M月d日 HH:mm", { locale: zhCN })}`;
    } catch (error) {
      console.error('Error parsing deleted_at date:', error);
      return "";
    }
  };

  // Removed clipboard image support for title - now handled by Vditor editor

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (userInputTimeoutRef.current) {
        clearTimeout(userInputTimeoutRef.current);
      }
    };
  }, []);

  if (!selectedTask) {
    return (
      <div className="flex-1 flex items-center justify-center h-screen bg-gray-50">
        <p className="text-gray-500">请选择一个任务查看详情</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      <div className="p-3 flex items-center justify-between border-b">
        <div className="flex items-center gap-3">
          <Checkbox
            checked={completed}
            onCheckedChange={handleCompletedChange}
            className="rounded-full h-5 w-5"
            disabled={isTaskInTrash}
          />
          <Separator orientation="vertical" />
          {isTaskInTrash ? (
            <div className="text-xs px-2 py-1 bg-muted rounded-md flex items-center">
              <CalendarIcon className="mr-2 h-3 w-3" />
              {selectedDate ? formatDateText(selectedDate) : "无截止日期"}
            </div>
          ) : (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn(
                  "text-xs h-7",
                )}>
                  <CalendarIcon className="mr-2 h-3 w-3" />
                  {selectedDate ? formatDateText(selectedDate) : "添加截止日期"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <DueDatePickerContent
                  selectedDate={selectedDate}
                  onChange={handleDateChange}
                  removeLabel="移除截止日期"
                />
              </PopoverContent>
          </Popover>
        )}
        </div>
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleCopyAsMarkdown}>
                <Copy className="mr-2 h-4 w-4" />
                复制为 Markdown
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 flex flex-col">
        <div className="space-y-0">
          <div className="flex items-center gap-3">
            {isTaskInTrash ? (
              <div className="flex-1 text-lg font-medium px-3 min-h-[40px] py-2 overflow-hidden">
                {title}
              </div>
            ) : (
              <Textarea
                ref={titleTextareaRef}
                value={title}
                onChange={handleTitleChange}
                onCompositionStart={handleTitleCompositionStart}
                onCompositionEnd={handleTitleCompositionEnd}
                className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-lg font-medium px-3 min-h-[32px] resize-none overflow-hidden"
                placeholder="任务标题"
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = `${target.scrollHeight}px`;
                }}
              />
            )}
          </div>
          {/* tags row */}
          {selectedTask && (
            <div className="px-3 py-1">
              <TagSelector taskId={selectedTask.id} projectId={selectedTask.project ?? null} readOnly={isTaskInTrash} />
            </div>
          )}
          <div className="text-xs text-gray-500 ml-1 mt-1 space-y-1">
            {selectedTask.completed_at && (
              <div>{formatCompletedAt()}</div>
            )}
            {isTaskInTrash && selectedTask.deleted_at && (
              <div className="text-amber-600">{formatDeletedAt()}</div>
            )}
          </div>
        </div>

        <div className="w-full flex-1 overflow-visible relative">
          {!isEditorUpdating && (
            <VditorEditor
              taskId={selectedTask.id}
              content={editorContent}
              onChange={handleEditorChange}
              readOnly={isTaskInTrash}
              onEditorReady={setBlockNoteEditor}
              attachments={attachments}
              onAttachmentsChange={(newAttachments) => {
                setAttachments(newAttachments);
                saveTask({ attachments: newAttachments });
              }}
            />
          )}
          {isTaskInTrash && (
            <div className="mt-4 p-3 bg-muted/50 rounded-md text-sm text-muted-foreground">
              <p>此任务已在垃圾桶中，无法编辑。如需编辑，请先恢复任务。</p>
            </div>
          )}
        </div>

        {/* File Attachments Section - 保留在底部，类似邮件附件 */}
        {attachments.length > 0 && (
          <div className="px-3 pb-3 border-t pt-3 mt-2">
            <TaskAttachments
              attachments={attachments}
              onAttachmentsChange={(newAttachments) => {
                setAttachments(newAttachments);
                saveTask({ attachments: newAttachments });
              }}
              readOnly={isTaskInTrash}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskDetail;
