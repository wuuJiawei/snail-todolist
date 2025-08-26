import React, { useState, useRef, useEffect } from "react";
import { useTaskContext } from "@/contexts/task";
import { useProjectContext } from "@/contexts/ProjectContext";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon-park";
import ProjectIcon from "@/components/ui/project-icon";
import { useIsMobile } from "@/hooks/use-mobile";
import { Task } from "@/types/task";
import { Tag } from "@/types/tag";
import { format, isValid, parseISO, isBefore, startOfDay } from "date-fns";
import { zhCN } from "date-fns/locale";
import { formatDateText as formatDateTextUtil } from "@/utils/taskUtils";
import { useToast } from "@/hooks/use-toast";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "@/components/ui/context-menu";
import DueDatePickerContent from "./DueDatePickerContent";
import { Draggable } from "@hello-pangea/dnd";
import TaskOperationProgress from "@/components/ui/task-operation-progress";
import { useTaskOperation } from "@/hooks/useTaskOperation";
import TagSelector from "./TagSelector";

interface TaskItemProps {
  task: Task;
  showProject?: boolean;
  projectName?: string;
  index?: number;
  isDraggable?: boolean;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, showProject = false, projectName, index, isDraggable = false }) => {
  const { selectTask, updateTask, moveToTrash, selectedTask, addTask, abandonTask, getTaskTags, listAllTags, attachTagToTask, detachTagFromTask, createTag } = useTaskContext();
  const { projects } = useProjectContext();
  const isMobile = useIsMobile();
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);
  const [localTitle, setLocalTitle] = useState(task.title);
  const inputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const { operationState, startOperation } = useTaskOperation();



  useEffect(() => {
    setLocalTitle(task.title);
    setEditedTitle(task.title);
  }, [task.title]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  // no-op



  const handleTaskSelect = () => {
    if (isMobile) {
      // On mobile, selecting a task should navigate to the task detail view
      // This will be handled by the parent component
    } else {
      // On desktop, just select the task for the detail pane
      selectTask(task.id);
    }
  };

  const handleCompletionToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // 防止操作进行中的重复点击
    if (operationState.isActive) return;

    await startOperation("complete", async () => {
      await updateTask(task.id, {
        completed: !task.completed,
        // The completed_at will be set in the service layer
      });

      // Show toast notification
      if (!task.completed) {
        toast({
          title: "任务已完成",
          description: `「${task.title}」已标记为完成`,
          variant: "default",
        });
      }
    });
  };

  const handleTitleClick = (e: React.MouseEvent) => {
    // First select the task, then enable editing
    selectTask(task.id);
    setIsEditing(true);
    e.stopPropagation();
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedTitle(e.target.value);
  };

  const handleTitleSave = async () => {
    if (editedTitle.trim() !== "") {
      setLocalTitle(editedTitle.trim());
      setIsEditing(false);
      await updateTask(task.id, { title: editedTitle.trim() });
    } else {
      setEditedTitle(task.title);
      setLocalTitle(task.title);
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleTitleSave();
    } else if (e.key === "Escape") {
      setEditedTitle(task.title);
      setLocalTitle(task.title);
      setIsEditing(false);
    }
  };

  const handleBlur = () => {
    handleTitleSave();
  };

  const isDeadlineExpired = (dateStr: string) => {
    try {
      const date = parseISO(dateStr);
      if (!isValid(date)) return false;
      const today = startOfDay(new Date());
      return isBefore(date, today);
    } catch (error) {
      return false;
    }
  };

  const formatDateText = (dateStr: string) => {
    try {
      const date = parseISO(dateStr);
      if (!isValid(date)) return "日期无效";
      return formatDateTextUtil(date);
    } catch (error) {
      return "日期无效";
    }
  };

  const handleDeleteTask = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    // 防止操作进行中的重复点击
    if (operationState.isActive) return;

    await startOperation("delete", async () => {
      await moveToTrash(task.id);
    });
  };

  const handleMoveToProject = async (targetProjectId: string | null) => {
    await startOperation("update", async () => {
      await updateTask(task.id, { project: targetProjectId });
      
      // 获取目标项目名称
      let targetProjectName = "";
      if (targetProjectId) {
        const targetProject = projects.find(p => p.id === targetProjectId);
        targetProjectName = targetProject?.name || "未知项目";
      }
      
      toast({
        title: "任务已移动",
        description: `「${task.title}」已移动到「${targetProjectName}」`,
        variant: "default",
      });
    });
  };

  const handleCopyToProject = async (targetProjectId: string | null) => {
    await startOperation("update", async () => {
      // 创建任务副本，保留所有属性但生成新ID
      const taskCopy = {
        title: task.title,
        completed: false, // 复制的任务默认为未完成状态  
        date: task.date,
        project: targetProjectId,
        description: task.description,
        // 不复制 completed_at, updated_at, user_id, sort_order, deleted, deleted_at
        // 这些会在 addTask 中自动处理
      };

      await addTask(taskCopy);
      
      // 获取目标项目名称
      let targetProjectName = "";
      if (targetProjectId) {
        const targetProject = projects.find(p => p.id === targetProjectId);
        targetProjectName = targetProject?.name || "未知项目";
      }
      
      toast({
        title: "任务已复制",
        description: `「${task.title}」已复制到「${targetProjectName}」`,
        variant: "default",
      });
    });
  };

  const handleMarkAsCompleted = async () => {
    await startOperation("complete", async () => {
      await updateTask(task.id, {
        completed: true,
        // completed_at 会在 service 层自动设置
      });

      toast({
        title: "任务已完成",
        description: `「${task.title}」已标记为完成`,
        variant: "default",
      });
    });
  };

  const handleAbandonTask = async () => {
    // 防止操作进行中的重复点击
    if (operationState.isActive) return;

    await startOperation("abandon", async () => {
      await abandonTask(task.id);
    });
  };


  // 从 task.date 解析当前选择日期
  const getSelectedDate = (): Date | undefined => {
    try {
      if (!task.date) return undefined;
      const parsed = parseISO(task.date);
      return isValid(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
  };

  // 右键菜单内设置/清除截止日期
  const handleContextMenuDateChange = async (date: Date | undefined) => {
    await startOperation("update", async () => {
      let dateString: string | undefined = undefined;
      if (date) {
        const normalizedDate = new Date(date);
        normalizedDate.setHours(0, 0, 0, 0);
        dateString = normalizedDate.toISOString();
      }
      await updateTask(task.id, { date: dateString });
      setIsContextMenuOpen(false);
    });
  };

  const renderDueDateSubmenu = () => {
    const selectedDate = getSelectedDate();
    return (
      <ContextMenuSub>
        <ContextMenuSubTrigger>
          <Icon icon="calendar" size="16" className="h-4 w-4 mr-2" />
          设置截止日期
        </ContextMenuSubTrigger>
        <ContextMenuSubContent sideOffset={-4} alignOffset={-2}>
          <DueDatePickerContent
            selectedDate={selectedDate}
            onChange={handleContextMenuDateChange}
            removeLabel="移除截止日期"
          />
        </ContextMenuSubContent>
      </ContextMenuSub>
    );
  };

  const renderContextMenuContent = () => (
    <>
      {!task.completed && !task.abandoned && (
        <>
          <ContextMenuItem onClick={handleMarkAsCompleted}>
            <Icon icon="check-one" size="16" className="h-4 w-4 mr-2" />
            标记为完成
          </ContextMenuItem>
          <ContextMenuItem onClick={handleAbandonTask}>
            <Icon icon="close-one" size="16" className="h-4 w-4 mr-2" />
            放弃
          </ContextMenuItem>
          <ContextMenuSeparator />
        </>
      )}

      {renderDueDateSubmenu()}
      <ContextMenuSeparator />

      {getAvailableProjects().length > 0 && (
        <>
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <Icon icon="arrow-circle-right" size="16" className="h-4 w-4 mr-2" />
              移动到
            </ContextMenuSubTrigger>
            <ContextMenuSubContent>
              {getAvailableProjects().map((project) => (
                <ContextMenuItem
                  key={project.id || "inbox"}
                  onClick={() => handleMoveToProject(project.id)}
                >
                  {project.id === null ? (
                    <Icon icon="inbox" size="16" className="h-4 w-4 mr-2" />
                  ) : (
                    <ProjectIcon 
                      icon={project.icon} 
                      color="#666"
                      size={16} 
                      className="h-4 w-4 mr-2" 
                    />
                  )}
                  {project.name}
                </ContextMenuItem>
              ))}
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuSeparator />
        </>
      )}

      <ContextMenuSub>
        <ContextMenuSubTrigger>
          <Icon icon="copy" size="16" className="h-4 w-4 mr-2" />
          复制到
        </ContextMenuSubTrigger>
        <ContextMenuSubContent>
          {getAvailableProjectsForCopy().map((project) => (
            <ContextMenuItem
              key={project.id || "inbox"}
              onClick={() => handleCopyToProject(project.id)}
            >
              {project.id === null ? (
                <Icon icon="inbox" size="16" className="h-4 w-4 mr-2" />
              ) : (
                <ProjectIcon 
                  icon={project.icon} 
                  color="#666"
                  size={16} 
                  className="h-4 w-4 mr-2" 
                />
              )}
              {project.name}
            </ContextMenuItem>
          ))}
        </ContextMenuSubContent>
      </ContextMenuSub>
      <ContextMenuSeparator />

      {/* 标签子菜单：悬停打开右侧弹层，略向左缩进 */}
      <ContextMenuSub>
        <ContextMenuSubTrigger>
          <Icon icon="tag-one" size="16" className="h-4 w-4 mr-2" />
          标签
        </ContextMenuSubTrigger>
        <ContextMenuSubContent sideOffset={-4} alignOffset={-2} className="p-0 w-72">
          <div className="p-2">
            <TagSelector taskId={task.id} projectId={task.project ?? null} readOnly={false} inline />
          </div>
        </ContextMenuSubContent>
      </ContextMenuSub>
      <ContextMenuSeparator />
      <ContextMenuItem onClick={handleDeleteTask} className="text-red-600">
        <Icon icon="delete" size="16" className="h-4 w-4 mr-2" />
        删除任务
      </ContextMenuItem>
    </>
  );



  // 获取可移动的目标项目列表
  const getAvailableProjects = () => {
    const availableProjects = [];

    // 添加用户创建的项目
    projects.forEach(project => {
      // 排除当前任务所在的项目
      if (project.id !== task.project) {
        availableProjects.push({
          id: project.id,
          name: project.name,
          icon: project.icon || "folder"
        });
      }
    });

    return availableProjects;
  };

  // 获取可复制的目标项目列表（包括当前项目，因为可以在同一项目中复制）
  const getAvailableProjectsForCopy = () => {
    const availableProjects = [
      
    ];

    // 添加用户创建的项目（包括当前项目）
    projects.forEach(project => {
      availableProjects.push({
        id: project.id,
        name: project.name,
        icon: project.icon || "folder"
      });
    });

    return availableProjects;
  };

  // Render the task content
  const renderTaskContent = (dragHandleProps?: React.HTMLAttributes<HTMLDivElement>, isDragging?: boolean) => (
    <div
      className={cn(
        "py-2 px-4 flex items-center gap-3 hover:bg-gray-100 rounded-lg cursor-pointer group transition-opacity duration-300 relative",
        task.completed && "opacity-60",
        selectedTask?.id === task.id && "bg-gray-200",
        isContextMenuOpen && "bg-gray-200",
        isDragging && "bg-gray-100 shadow-md"
      )}
      onClick={handleTaskSelect}
    >
      {/* 任务操作进度条覆盖层 */}
      <TaskOperationProgress
        isVisible={operationState.isActive}
        operationType={operationState.operationType}
        progress={operationState.progress}
      />
      {isDraggable && (
        <div
          className="h-5 w-5 flex-shrink-0 flex items-center justify-center text-gray-300 group-hover:text-gray-500 transition-colors cursor-grab"
          {...dragHandleProps}
        >
          <Icon icon="drag" size="16" className="h-4 w-4" />
        </div>
      )}
          <div
            className={cn(
              "h-5 w-5 flex-shrink-0 border border-gray-300 rounded-full flex items-center justify-center transition-all duration-300",
              operationState.isActive && operationState.operationType === "complete" && !task.completed && "scale-125 border-green-500",
              "hover:bg-gray-200",
              task.completed && "border-black bg-black hover:bg-black"
            )}
            onClick={handleCompletionToggle}
          >
            {task.completed && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="white"
                width="12"
                height="12"
                className="transition-transform duration-300"
              >
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            )}
            {operationState.isActive && operationState.operationType === "complete" && !task.completed && (
              <Icon icon="check-small" size="12" className="h-3 w-3 text-green-500 animate-[pulse_0.5s_ease-in-out]" />
            )}
          </div>

          <div className="flex-1 truncate">
            <div className="text-sm leading-tight truncate flex items-center gap-2" onClick={handleTitleClick}>
              {task.icon && (
                <span 
                  className="text-sm flex-shrink-0"
                  style={{
                    fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif',
                  }}
                >
                  {task.icon}
                </span>
              )}
              {isEditing ? (
                <input
                  ref={inputRef}
                  type="text"
                  value={editedTitle}
                  onChange={handleTitleChange}
                  onBlur={handleBlur}
                  onKeyDown={handleKeyDown}
                  className="w-full px-0 border-none focus:outline-none focus:ring-0 bg-transparent"
                />
              ) : (
                <span className={cn(
                  task.completed && "line-through text-gray-500 transition-all duration-300"
                )}>
                  {localTitle}
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
              {showProject && projectName && (
                <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 mr-1">
                  {projectName}
                </span>
              )}
              {task.date && (
                <div className={cn(
                  "flex items-center gap-1",
                  isDeadlineExpired(task.date) ? "text-red-500" : "text-green-600"
                )}>
                  <Icon icon="calendar" size="12" className="h-3 w-3" />
                  <span>截止: {formatDateText(task.date)}</span>
                </div>
              )}
              {task.completed && task.completed_at && (
                <div className="text-gray-400 text-xs ml-2">
                  {format(parseISO(task.completed_at), "M月d日完成", { locale: zhCN })}
                </div>
              )}
              {/* tags display */}
              {(() => {
                const tags = getTaskTags(task.id);
                if (!tags || tags.length === 0) return null;
                const display = tags.slice(0, 3);
                const extra = tags.length - display.length;
                return (
                  <div className="flex items-center gap-1 ml-1">
                    {display.map(t => (
                      <span key={t.id} className="px-1 py-0.5 rounded bg-gray-100 text-gray-700">{t.name}</span>
                    ))}
                    {extra > 0 && (
                      <span className="px-1 py-0.5 rounded bg-gray-50 text-gray-500">+{extra}</span>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
  );

  // Wrap with Draggable if needed
  if (isDraggable && typeof index === 'number') {
    return (
      <Draggable draggableId={task.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            className={cn(
              snapshot.isDragging && "z-10"
            )}
          >
            <ContextMenu onOpenChange={setIsContextMenuOpen}>
              <ContextMenuTrigger>
                {renderTaskContent(provided.dragHandleProps, snapshot.isDragging)}
              </ContextMenuTrigger>
              <ContextMenuContent>
                {renderContextMenuContent()}
              </ContextMenuContent>
            </ContextMenu>
          </div>
        )}
      </Draggable>
    );
  }

  // Regular non-draggable rendering
  return (
    <ContextMenu onOpenChange={setIsContextMenuOpen}>
      <ContextMenuTrigger>
        {renderTaskContent()}
      </ContextMenuTrigger>
      <ContextMenuContent>
        {renderContextMenuContent()}
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default TaskItem;
