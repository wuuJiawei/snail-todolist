import React, { useState } from "react";
import { useTaskContext } from "@/contexts/task";
import { format, parseISO, isToday, isTomorrow, isYesterday, isValid, isBefore, startOfDay } from "date-fns";
import { zhCN } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Trash2, RefreshCw, AlertCircle } from "lucide-react";
import TaskItem from "@/components/tasks/TaskItem";
import { useProjectContext } from "@/contexts/ProjectContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const TrashView: React.FC = () => {
  const { trashedTasks, restoreFromTrash, deleteTask, selectTask } = useTaskContext();
  const { projects } = useProjectContext();

  // Group tasks by deletion date
  const groupTasksByDate = () => {
    const grouped: { [date: string]: typeof trashedTasks } = {};

    trashedTasks.forEach(task => {
      if (task.deleted_at) {
        // Extract just the date part (YYYY-MM-DD)
        const dateStr = task.deleted_at.split('T')[0];
        if (!grouped[dateStr]) {
          grouped[dateStr] = [];
        }
        grouped[dateStr].push(task);
      }
    });

    // Convert to array and sort by date (most recent first)
    return Object.entries(grouped)
      .map(([date, tasks]) => ({ date, tasks }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const groupedTasks = groupTasksByDate();

  const handleRestoreTask = async (id: string) => {
    await restoreFromTrash(id);
  };

  const handleDeleteTask = async (id: string) => {
    await deleteTask(id);
  };


  const formatDateHeader = (dateStr: string) => {
    try {
      const date = parseISO(dateStr);
      return format(date, "yyyy年MM月dd日", { locale: zhCN });
    } catch (error) {
      return dateStr;
    }
  };

  return (
    <div className="flex flex-col h-full p-4">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-xl font-semibold">垃圾桶</h2>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground mb-4">
        删除的任务会在垃圾桶中保留30天，之后将被自动清除。
      </p>

      {/* Task list */}
      <ScrollArea className="flex-1 h-[calc(100vh-200px)]" type="auto">
        {trashedTasks.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-12">
            <AlertCircle className="h-12 w-12 mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-medium mb-2">垃圾桶为空</h3>
            <p className="text-sm">删除的任务将会显示在这里</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedTasks.map(({ date, tasks }) => (
              <div key={date} className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  {formatDateHeader(date)}
                </h3>
                <div className="space-y-1">
                  {tasks.map(task => (
                    <TrashTaskItem
                      key={task.id}
                      task={task}
                      projectName={projects.find(p => p.id === task.project)?.name}
                      onRestore={() => handleRestoreTask(task.id)}
                      onDelete={() => handleDeleteTask(task.id)}
                      onSelect={() => selectTask(task.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

interface TrashTaskItemProps {
  task: any;
  projectName?: string;
  onRestore: () => void;
  onDelete: () => void;
  onSelect: () => void;
}

const TrashTaskItem: React.FC<TrashTaskItemProps> = ({ task, projectName, onRestore, onDelete, onSelect }) => {
  // Format date functions
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
      if (!isValid(date)) {
        return null;
      }

      if (isToday(date)) return "今天";
      if (isTomorrow(date)) return "明天";
      if (isYesterday(date)) return "昨天";

      return format(date, "M月d日", { locale: zhCN });
    } catch (error) {
      return null;
    }
  };

  // Check if task has a deadline
  const hasDeadline = task.date && task.date.length > 0;
  const deadlineExpired = hasDeadline && isDeadlineExpired(task.date);
  const deadlineText = hasDeadline ? formatDateText(task.date) : null;

  return (
    <div
      className="flex items-center p-2 rounded-md hover:bg-accent/50 group cursor-pointer"
      onClick={onSelect}
    >
      <div className="flex-1 truncate">
        <div className="flex flex-col">
          <div className="flex items-center">
            <span className={`truncate ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
              {task.title}
            </span>
            {projectName && (
              <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                {projectName}
              </span>
            )}
          </div>
          {deadlineText && (
            <div className="text-xs mt-1">
              <span className={`${deadlineExpired ? 'text-destructive' : 'text-muted-foreground'}`}>
                截止: {deadlineText}
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="icon" onClick={onRestore} className="h-8 w-8">
          <RefreshCw className="h-4 w-4" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认永久删除？</AlertDialogTitle>
              <AlertDialogDescription>
                此操作将永久删除该任务，无法恢复。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete}>确认删除</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default TrashView;