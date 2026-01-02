import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from "react";
import { useTaskContext } from "@/contexts/task";
import { TaskAttachment } from "@/types/task";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { format, parseISO, isValid } from "date-fns";
import { zhCN } from "date-fns/locale";
import TaskDetailSkeleton from "@/components/tasks/TaskDetailSkeleton";
import { useDebouncedCallback } from 'use-debounce';
import TaskDetailTitleSection from "./TaskDetailTitleSection";
import TaskDetailContent, { EditorBridge } from "./TaskDetailContent";
import TaskActivityDialog from "./TaskActivityDialog";
import { useTaskOperation } from "@/hooks/useTaskOperation";

const TaskDetail = () => {
  const { selectedTask, updateTask, selectTask, trashedTasks } = useTaskContext();
  const { toast } = useToast();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [completed, setCompleted] = useState(false);
  const [flagged, setFlagged] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [editorContent, setEditorContent] = useState("");
  const [isEditorUpdating, setIsEditorUpdating] = useState(false);
  const [blockNoteEditor, setBlockNoteEditor] = useState<EditorBridge | null>(null);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const { operationState, startOperation } = useTaskOperation();
  const isCompletionLoading = operationState.isActive && operationState.operationType === "complete";

  // 核心：追踪当前期望显示的任务 ID，用于防止竞态条件
  const expectedTaskIdRef = useRef<string | null>(null);
  
  // Track task switching with a ref to avoid unnecessary re-renders
  const previousTaskIdRef = useRef<string | null>(null);
  
  // 追踪当前正在编辑的任务ID，防止保存到错误的任务
  const currentEditingTaskIdRef = useRef<string | null>(null);
  
  // Add refs to track user input state
  const isUserTypingRef = useRef(false);
  const userInputTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // 追踪编辑器更新定时器，用于清理
  const editorUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check if the selected task is in the trash
  const isTaskInTrash = selectedTask ? trashedTasks.some(task => task.id === selectedTask.id) : false;

  // Reference to the title textarea element
  const titleTextareaRef = useRef<HTMLTextAreaElement>(null);
  const cursorPosRef = useRef<{ start: number | null; end: number | null }>({ start: null, end: null });
  const shouldRestoreCursorRef = useRef(false);

  // IME composition state for title input
  const [isTitleComposing, setIsTitleComposing] = useState(false);

  // Sync attachments when selectedTask updates (e.g., after save)
  useEffect(() => {
    if (!selectedTask || isUserTypingRef.current) {
      return;
    }
    setAttachments(selectedTask.attachments || []);
  }, [selectedTask]);

  const saveTask = useCallback(async (updates: Partial<typeof selectedTask>, taskIdToSave?: string) => {
    if (!selectedTask) return;

    const targetTaskId = taskIdToSave || selectedTask.id;
    
    // 防止竞态条件：确保保存的任务与当前期望的任务一致
    if (expectedTaskIdRef.current && expectedTaskIdRef.current !== targetTaskId) {
      return;
    }

    if (currentEditingTaskIdRef.current && currentEditingTaskIdRef.current !== targetTaskId) {
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

  useEffect(() => {
    if (!selectedTask) {
      expectedTaskIdRef.current = null;
      return;
    }

    // 立即更新期望的任务 ID
    const taskId = selectedTask.id;
    expectedTaskIdRef.current = taskId;

    const isNewTaskSelection = previousTaskIdRef.current !== taskId;

    if (isNewTaskSelection && previousTaskIdRef.current !== null) {
      debouncedTitleSave.flush();
      debouncedContentSave.flush();
    }

    previousTaskIdRef.current = taskId;

    if (isNewTaskSelection) {
      currentEditingTaskIdRef.current = taskId;
    }

    if (isNewTaskSelection && !isUserTypingRef.current) {
      setTitle(selectedTask.title);
    }

    setCompleted(selectedTask.completed);
    setFlagged(Boolean(selectedTask.flagged));

    if (!isNewTaskSelection) {
      return;
    }

    // 清理之前的定时器
    if (editorUpdateTimerRef.current) {
      clearTimeout(editorUpdateTimerRef.current);
      editorUpdateTimerRef.current = null;
    }

    setIsEditorUpdating(true);
    setEditorContent(selectedTask.description || '');
    setAttachments(selectedTask.attachments || []);
    setSelectedDate(undefined);

    if (selectedTask.date) {
      try {
        const date = parseISO(selectedTask.date);
        if (isValid(date)) {
          setSelectedDate(date);
        }
      } catch (error) {
        console.error('Error parsing date:', error);
      }
    }

    if (titleTextareaRef.current) {
      requestAnimationFrame(() => {
        if (titleTextareaRef.current) {
          titleTextareaRef.current.style.height = 'auto';
          titleTextareaRef.current.style.height = `${titleTextareaRef.current.scrollHeight}px`;
        }
      });
    }

    // 使用 ref 追踪的任务 ID 来防止竞态条件
    editorUpdateTimerRef.current = setTimeout(() => {
      // 只有当期望的任务 ID 仍然匹配时才更新状态
      if (expectedTaskIdRef.current === taskId) {
        setIsEditorUpdating(false);
      }
    }, 150);

    return () => {
      if (editorUpdateTimerRef.current) {
        clearTimeout(editorUpdateTimerRef.current);
        editorUpdateTimerRef.current = null;
      }
    };
  }, [selectedTask, debouncedTitleSave, debouncedContentSave]);

  useEffect(() => {
    if (!selectedTask) return;
    const sameTask = previousTaskIdRef.current === selectedTask.id;
    if (sameTask && !isUserTypingRef.current && !isTitleComposing) {
      setTitle((prev) => (prev !== selectedTask.title ? selectedTask.title : prev));
    }
  }, [selectedTask?.id, selectedTask?.title, isTitleComposing]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newTitle = e.target.value;
    
    // Mark user as typing and record input time
    isUserTypingRef.current = true;
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
    if (!selectedTask || isTaskInTrash) return;
    const newCompleted = checked === true;
    startOperation("complete", async () => {
      await updateTask(selectedTask.id, { completed: newCompleted });
      setCompleted(newCompleted);
    });
  };

  const handleFlagToggle = useCallback(async () => {
    if (!selectedTask || isTaskInTrash) return;

    const previousFlagged = flagged;
    const nextFlagged = !previousFlagged;
    setFlagged(nextFlagged);

    try {
      await updateTask(selectedTask.id, { flagged: nextFlagged });
      toast({
        title: nextFlagged ? "任务已标记" : "标记已取消",
        description: nextFlagged ? "该任务会出现在“标记”清单中" : "该任务已从“标记”清单移除",
      });
    } catch (error) {
      console.error("Failed to toggle flag:", error);
      setFlagged(previousFlagged);
      toast({
        title: "更新标记失败",
        description: "请稍后再试",
        variant: "destructive",
      });
    }
  }, [flagged, isTaskInTrash, selectedTask, updateTask, toast]);

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
    // 防止竞态条件：确保当前编辑的任务与期望的任务一致
    if (!selectedTask || isEditorUpdating) return;
    
    if (expectedTaskIdRef.current !== selectedTask.id) {
      return;
    }

    if (currentEditingTaskIdRef.current !== selectedTask.id) {
      return;
    }

    setEditorContent(content);
    debouncedContentSave(content, selectedTask.id);
  };

  const handleClose = () => {
    debouncedTitleSave.flush();
    debouncedContentSave.flush();
    selectTask(null);
  };

  const handleAttachmentsChange = useCallback((newAttachments: TaskAttachment[]) => {
    setAttachments(newAttachments);
    saveTask({ attachments: newAttachments });
  }, [saveTask]);

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

  // Removed clipboard image support for title - rich text editor handles paste uploads

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (userInputTimeoutRef.current) {
        clearTimeout(userInputTimeoutRef.current);
      }
      if (editorUpdateTimerRef.current) {
        clearTimeout(editorUpdateTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setActivityDialogOpen(false);
  }, [selectedTask?.id]);

  if (!selectedTask) {
    return (
      <div className="flex-1 flex items-center justify-center h-screen bg-gray-50">
        <p className="text-gray-500">请选择一个任务查看详情</p>
      </div>
    );
  }

  if (isEditorUpdating) {
    return <TaskDetailSkeleton />;
  }

  const completedAtLabel = formatCompletedAt();
  const deletedAtLabel = isTaskInTrash ? formatDeletedAt() : "";

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-muted/10">
      <div className={`flex-1 overflow-y-auto custom-scrollbar px-6 py-5 flex flex-col gap-6 ${isCompletionLoading ? "opacity-60 pointer-events-none" : ""}`}>
        <section className="bg-background border border-border/60 rounded-xl shadow-sm px-5 py-4">
          <TaskDetailTitleSection
            title={title}
            titleRef={titleTextareaRef}
            isTaskInTrash={isTaskInTrash}
            onTitleChange={handleTitleChange}
            onCompositionStart={handleTitleCompositionStart}
            onCompositionEnd={handleTitleCompositionEnd}
            selectedTask={selectedTask}
            completedAtLabel={completedAtLabel}
            deletedAtLabel={deletedAtLabel}
            completed={completed}
            flagged={flagged}
            selectedDate={selectedDate}
            isCompletionLoading={isCompletionLoading}
            onCompletedChange={handleCompletedChange}
            onFlagToggle={handleFlagToggle}
            onDateChange={handleDateChange}
            onCopyAsMarkdown={handleCopyAsMarkdown}
            onClose={handleClose}
            onShowActivityLog={() => setActivityDialogOpen(true)}
          />
        </section>

        <section className="bg-background border border-border/60 rounded-xl shadow-sm px-5 py-4 flex-1 flex flex-col">
          <TaskDetailContent
            taskId={selectedTask.id}
            editorContent={editorContent}
            isTaskInTrash={isTaskInTrash}
            isEditorUpdating={isEditorUpdating}
            onEditorChange={handleEditorChange}
            onEditorReady={setBlockNoteEditor}
            attachments={attachments}
            onAttachmentsChange={handleAttachmentsChange}
          />
        </section>
      </div>
      <TaskActivityDialog
        taskId={selectedTask.id}
        taskTitle={selectedTask.title}
        open={activityDialogOpen}
        onOpenChange={setActivityDialogOpen}
      />
    </div>
  );
};

export default TaskDetail;
