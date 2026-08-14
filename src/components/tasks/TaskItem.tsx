import React, { useState, useRef, useEffect } from "react";
import { useTaskContext } from "@/contexts/task";
import { useProjectContext } from "@/contexts/ProjectContext";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon-park";
import ProjectIcon from "@/components/ui/project-icon";
import { Task } from "@/types/task";
import { Tag } from "@/types/tag";
import { format, parseISO } from "date-fns";
import { zhCN } from "date-fns/locale";
import { getChangedTaskTitle } from "@/utils/taskUtils";
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
import TaskDatePickerContent from "./TaskDatePickerContent";
import { Draggable } from "@hello-pangea/dnd";
import { Eye, Loader2 } from "lucide-react";
import { useTaskOperation } from "@/hooks/useTaskOperation";
import TagSelector from "./TagSelector";
import {
  formatTaskDate,
  isTaskDateExpired,
  serializeTaskDateValue,
  toTaskDateValue,
  type TaskDateValue,
} from "@/utils/taskDate";

interface TaskItemProps {
  task: Task;
  showProject?: boolean;
  projectName?: string;
  index?: number;
  isDraggable?: boolean;
  showViewDetailsAction?: boolean;
}

const TaskItem: React.FC<TaskItemProps> = ({
  task,
  showProject = false,
  projectName,
  index,
  isDraggable = false,
  showViewDetailsAction = false,
}) => {
  const { selectTask, updateTask, moveToTrash, selectedTask, addTask, abandonTask, restoreAbandonedTask, getTaskTags, listAllTags, attachTagToTask, detachTagFromTask, createTag } = useTaskContext();
  const { projects } = useProjectContext();
  const [isEditing, setIsEditing] = useState(false);
  const [isHoverActive, setIsHoverActive] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const isComposingRef = useRef(false);

  const { toast } = useToast();
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const { operationState, startOperation } = useTaskOperation();
  useEffect(() => {
    setEditedTitle(task.title);
  }, [task.title]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleTaskClick = () => {
    selectTask(task.id);
    setIsEditing(true);
  };

  const handleViewDetails = () => {
    selectTask(task.id);
    setIsEditing(false);
    setIsContextMenuOpen(false);
  };

  const handleCompletionToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (operationState.isActive && operationState.operationType !== "update") return;

    const nextCompleted = !task.completed;
    try {
      await startOperation("complete", async () => {
        await updateTask(task.id, { completed: nextCompleted });
      });
      if (nextCompleted) {
        toast({
          title: "任务已完成",
          description: `「${task.title}」已标记为完成`,
          variant: "default",
        });
      } else {
        toast({
          title: "已取消完成",
          description: `「${task.title}」已恢复为未完成`,
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Failed to toggle completion:", error);
      toast({
        title: "更新失败",
        description: "无法更新完成状态，请稍后重试",
        variant: "destructive",
      });
    }
  };

  const cancelTitleEdit = () => {
    setEditedTitle(task.title);
    setIsEditing(false);
  };

  const handleTitleSave = async () => {
    const nextTitle = getChangedTaskTitle(task.title, editedTitle);
    if (!nextTitle) {
      cancelTitleEdit();
      return;
    }

    try {
      await startOperation("update", () => updateTask(task.id, { title: nextTitle }));
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to save title:", err);
      cancelTitleEdit();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const composing = e.nativeEvent.isComposing || e.nativeEvent.keyCode === 229 || isComposingRef.current;
      if (composing) {
        e.preventDefault();
        return;
      }
      handleTitleSave();
    } else if (e.key === "Escape") {
      cancelTitleEdit();
    }
  };

  const handleDeleteTask = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    // 防止操作进行中的重复点击
    if (operationState.isActive) return;

    try {
      await startOperation("delete", async () => {
        await moveToTrash(task.id);
      });
    } catch (error) {
      console.error("Failed to move task to trash:", error);
    }
  };

  const handleMoveToProject = async (targetProjectId: string | null) => {
    try {
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
    } catch (error) {
      console.error("Failed to move task:", error);
    }
  };

  const handleCopyToProject = async (targetProjectId: string | null) => {
    try {
      await startOperation("update", async () => {
        // 创建任务副本，保留所有属性但生成新ID
        const taskCopy = {
          title: task.title,
          completed: false, // 复制的任务默认为未完成状态  
          date: task.date,
          date_type: task.date_type,
          end_date: task.end_date,
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
    } catch (error) {
      console.error("Failed to copy task:", error);
    }
  };

  const handleMarkAsCompleted = async () => {
    try {
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
    } catch (error) {
      console.error("Failed to mark task as completed:", error);
    }
  };

  const handleToggleFlag = async () => {
    try {
      await startOperation("update", async () => {
        const nextFlagged = !task.flagged;
        await updateTask(task.id, { flagged: nextFlagged });
        toast({
          title: nextFlagged ? "任务已标记" : "标记已取消",
          description: nextFlagged ? "该任务会出现在“标记”清单中" : "该任务已从“标记”清单移除",
          variant: "default",
        });
      });
    } catch (error) {
      console.error("Failed to toggle flag:", error);
    }
  };

  const handleAbandonTask = async () => {
    // 防止操作进行中的重复点击
    if (operationState.isActive) return;

    try {
      await startOperation("abandon", async () => {
        await abandonTask(task.id);
      });
    } catch (error) {
      console.error("Failed to abandon task:", error);
    }
  };

  const handleRestoreAbandonedTask = async () => {
    // 防止操作进行中的重复点击
    if (operationState.isActive) return;

    try {
      await startOperation("restore", async () => {
        await restoreAbandonedTask(task.id);
      });
    } catch (error) {
      console.error("Failed to restore task:", error);
    }
  };


  // 右键菜单内设置/清除任务时间
  const handleContextMenuDateChange = async (value: TaskDateValue) => {
    await startOperation("update", async () => {
      await updateTask(task.id, serializeTaskDateValue(value));
      setIsContextMenuOpen(false);
    });
  };

  const renderDueDateSubmenu = () => {
    return (
      <ContextMenuSub>
        <ContextMenuSubTrigger>
          <Icon icon="calendar" size="16" className="h-4 w-4 mr-2" />
          设置任务时间
        </ContextMenuSubTrigger>
        <ContextMenuSubContent sideOffset={-4} alignOffset={-2}>
          <TaskDatePickerContent
            value={toTaskDateValue(task)}
            onChange={handleContextMenuDateChange}
            removeLabel="移除任务时间"
          />
        </ContextMenuSubContent>
      </ContextMenuSub>
    );
  };

  const renderContextMenuContent = () => (
    <>
      {showViewDetailsAction && (
        <>
          <ContextMenuItem onClick={handleViewDetails}>
            <Eye className="mr-2 h-4 w-4" />
            查看详情
          </ContextMenuItem>
          <ContextMenuSeparator />
        </>
      )}

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

      {task.abandoned && (
        <>
          <ContextMenuItem onClick={handleRestoreAbandonedTask}>
            <Icon icon="undo" size="16" className="h-4 w-4 mr-2" />
            恢复任务
          </ContextMenuItem>
          <ContextMenuSeparator />
        </>
      )}

      {!task.abandoned && (
        <>
          <ContextMenuItem onClick={handleToggleFlag}>
            <Icon icon="flag" size="16" className={cn("h-4 w-4 mr-2", task.flagged ? "text-rose-700" : undefined)} />
            {task.flagged ? "取消标记" : "标记任务"}
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
          "task-item py-2 px-4 flex items-center overflow-hidden hover:bg-gray-100 rounded-lg cursor-pointer group transition-opacity duration-300 relative",
          task.completed && "opacity-60",
          operationState.isActive && "opacity-60 pointer-events-none",
          selectedTask?.id === task.id && "bg-gray-200",
          isContextMenuOpen && "bg-gray-200",
          isDragging && "bg-gray-100 shadow-md"
        )}
        data-controls-visible={isHoverActive || operationState.isActive || isDragging || undefined}
        data-draggable={isDraggable}
        onPointerEnter={() => setIsHoverActive(true)}
        onPointerLeave={() => setIsHoverActive(false)}
        onClickCapture={() => setIsHoverActive(false)}
        onClick={handleTaskClick}
      >
      {/* 任务操作进度条覆盖层 */}

      <div className="absolute left-4 top-1/2 -translate-y-1/2">
        <div
          className="task-item-controls flex items-center gap-3"
          onClick={(event) => event.stopPropagation()}
        >
          {isDraggable && (
            <div
              className="h-5 w-5 flex-shrink-0 flex items-center justify-center text-gray-300 hover:text-gray-500 transition-colors cursor-grab"
              {...dragHandleProps}
            >
              <Icon icon="drag" size="16" className="h-4 w-4" />
            </div>
          )}
          <button
            type="button"
            role="checkbox"
            aria-checked={task.completed}
            aria-busy={operationState.isActive}
            aria-label={task.completed ? `将「${task.title}」标记为未完成` : `将「${task.title}」标记为完成`}
            disabled={operationState.isActive}
            className={cn(
              "h-5 w-5 flex-shrink-0 border border-gray-300 rounded-full p-0 flex items-center justify-center transition-colors",
              "hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              task.completed && "border-black bg-black hover:bg-black"
            )}
            onClick={handleCompletionToggle}
          >
            {operationState.isActive ? (
              <Loader2 className="h-3 w-3 text-gray-400 animate-spin" />
            ) : (
              task.completed && (
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
              )
            )}
          </button>
        </div>
      </div>

          <div className="task-item-body min-w-0 flex-1 truncate">
            <div className="text-sm leading-tight truncate flex items-center gap-2">
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
              {task.flagged && (
                <Icon icon="flag" size="14" className="h-3.5 w-3.5 text-rose-700 flex-shrink-0" />
              )}
              {isEditing ? (
                <input
                  ref={inputRef}
                  type="text"
                  value={editedTitle}
                  onChange={(event) => setEditedTitle(event.target.value)}
                  onBlur={() => void handleTitleSave()}
                  onKeyDown={handleKeyDown}
                  onCompositionStart={() => { isComposingRef.current = true; }}
                  onCompositionEnd={() => { isComposingRef.current = false; }}
                  className="w-full px-0 border-none focus:outline-none focus:ring-0 bg-transparent font-medium"
                />
              ) : (
                <span className={cn(
                  "font-medium",
                  task.completed && "line-through text-gray-500 transition-all duration-300"
                )}>
                  {task.title}
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
                  isTaskDateExpired(task) ? "text-red-500" : "text-muted-foreground"
                )}>
                  <Icon icon="calendar" size="12" className="h-3 w-3" />
                  <span>{formatTaskDate(task)}</span>
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
      <Draggable draggableId={task.id} index={index} isDragDisabled={operationState.isActive}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            className={cn(
              snapshot.isDragging && "z-10"
            )}
          >
            <ContextMenu open={isContextMenuOpen} onOpenChange={setIsContextMenuOpen}>
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

  return (
    <ContextMenu open={isContextMenuOpen} onOpenChange={setIsContextMenuOpen}>
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
