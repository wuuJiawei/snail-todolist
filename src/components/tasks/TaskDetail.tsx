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
import SimpleTaskEditor from "./SimpleTaskEditor";
import TagSelector from "./TagSelector";
import TaskAttachments from "./TaskAttachments";
import { useDebouncedCallback } from 'use-debounce';
import { addClipboardImageSupport } from "@/utils/clipboardUtils";

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

  useEffect(() => {
    if (selectedTask) {
      // Check if this is a new task selection
      const isNewTaskSelection = previousTaskIdRef.current !== selectedTask.id;
      previousTaskIdRef.current = selectedTask.id;

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

        // Reset editor updating flag after a delay to ensure proper rendering
        setTimeout(() => {
          setIsEditorUpdating(false);
        }, 100);
      }
    }
  }, [selectedTask]);

  // Sync attachments when selectedTask updates (e.g., after save)
  useEffect(() => {
    if (selectedTask && !isUserTypingRef.current) {
      setAttachments(selectedTask.attachments || []);
    }
  }, [selectedTask?.attachments]);

  const saveTask = useCallback(async (updates: Partial<typeof selectedTask>) => {
    if (!selectedTask) return;

    try {
      await updateTask(selectedTask.id, updates);
    } catch (error) {
      console.error("Failed to save task", error);
      toast({
        title: "保存失败",
        description: "无法保存任务更新",
        variant: "destructive",
      });
    }
  }, [selectedTask, updateTask, toast]);

  // Reduce debounce time for better responsiveness
  const debouncedSave = useDebouncedCallback(saveTask, 800);

  const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newTitle = e.target.value;
    
    // Mark user as typing and record input time
    isUserTypingRef.current = true;
    lastUserInputTimeRef.current = Date.now();
    shouldRestoreCursorRef.current = true;
    
    // Store cursor position before state update
    cursorPosRef.current = { start: e.target.selectionStart, end: e.target.selectionEnd };
    
    setTitle(newTitle);
    debouncedSave({ title: newTitle });
    
    // Clear existing timeout and set new one to mark end of typing
    if (userInputTimeoutRef.current) {
      clearTimeout(userInputTimeoutRef.current);
    }
    
    userInputTimeoutRef.current = setTimeout(() => {
      isUserTypingRef.current = false;
      shouldRestoreCursorRef.current = false;
    }, 1000); // User considered done typing after 1 second of inactivity
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
      // Update local state immediately to prevent flickering
      setEditorContent(content);

      // Debounce the actual save operation
      debouncedSave({ description: content });
    }
  };

  const handleClose = () => {
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

  // Setup clipboard image support for title textarea
  useEffect(() => {
    if (!titleTextareaRef.current || !user || isTaskInTrash) return;

    const cleanup = addClipboardImageSupport(titleTextareaRef.current, {
      userId: user.id,
      onUploadStart: () => {
        toast({
          title: "正在上传图片...",
          description: "请稍候",
        });
      },
      onUploadComplete: (attachment) => {
        // Add to attachments
        const newAttachments = [...attachments, attachment];
        setAttachments(newAttachments);
        saveTask({ attachments: newAttachments });
        
        toast({
          title: "图片上传成功",
          description: `已添加图片: ${attachment.original_name}`,
        });
      },
      onUploadError: (error) => {
        toast({
          title: "图片上传失败",
          description: error,
          variant: "destructive",
        });
      }
    });

    return cleanup;
  }, [user, attachments, saveTask, toast, isTaskInTrash]);

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
            <SimpleTaskEditor
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

        {/* File Attachments Section */}
        <div className="px-3 pb-3">
          <TaskAttachments
            attachments={attachments}
            onAttachmentsChange={(newAttachments) => {
              setAttachments(newAttachments);
              saveTask({ attachments: newAttachments });
            }}
            readOnly={isTaskInTrash}
          />
        </div>
      </div>
    </div>
  );
};

export default TaskDetail;
