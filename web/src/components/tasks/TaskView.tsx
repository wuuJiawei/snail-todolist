
import React from "react";
import { useTaskContext } from "@/contexts/task";
import TaskHeader from "./TaskHeader";
import TaskList from "./TaskList";
import CompletedTasksView from "./CompletedTasksView";
import AbandonedTasksView from "./AbandonedTasksView";
import TrashView from "./TrashView";
import { useSidebar } from "@/contexts/SidebarContext";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon-park";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const TaskView: React.FC = () => {
  const {
    selectedProject,
    tasks,
    trashedTasks,
    abandonedTasks,
    deleteTask,
    trashedLoading,
    abandonedLoading,
    trashedLoaded,
    abandonedLoaded,
  } = useTaskContext();
  const { collapsed, setCollapsed } = useSidebar();
  const [showTopHeader, setShowTopHeader] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  useEffect(() => {
    setShowTopHeader(["completed", "abandoned", "trash"].includes(selectedProject));
  }, [selectedProject]);

  const renderContent = () => {
    console.log('selectedProject', selectedProject);
    switch (selectedProject) {
      case "completed":
        return (
          <CompletedTasksView
            tasks={tasks.filter(task => task.completed)}
            exportDialogOpen={exportDialogOpen}
            onExportDialogChange={setExportDialogOpen}
          />
        );
      case "abandoned":
        if (abandonedLoading && !abandonedLoaded) {
          return (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              正在加载已放弃任务...
            </div>
          );
        }
        return (
          <AbandonedTasksView
            tasks={abandonedTasks}
          />
        );
      case "trash":
        if (trashedLoading && !trashedLoaded && trashedTasks.length === 0) {
          return (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              正在加载垃圾桶...
            </div>
          );
        }
        return <TrashView />;
      default:
        return <TaskList />;
    }
  };

  // 获取当前视图的标题和图标
  const getViewInfo = () => {
    switch (selectedProject) {
      case "recent":
        return { name: "最近7天", icon: "calendar" };
      case "today":
        return { name: "今天", icon: "calendar-days" };
      case "flagged":
        return { name: "标记", icon: "flag" };
      case "completed":
        return { name: "已完成", icon: "check-square" };
      case "abandoned":
        return { name: "已放弃", icon: "close-one" };
      case "trash":
        return { name: "垃圾桶", icon: "trash-2" };
      default:
        return { name: "所有任务", icon: "list" };
    }
  };

  const viewInfo = getViewInfo();

  // Handle empty trash action
  const handleEmptyTrash = async () => {
    // Delete all tasks in trash
    if (!trashedLoaded || trashedLoading) {
      return;
    }

    for (const task of trashedTasks) {
      await deleteTask(task.id);
    }
    setConfirmDeleteAll(false);
  };

  // Render the appropriate actions for each view
  const renderHeaderActions = () => {
    if (selectedProject === "completed") {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 px-2">
              <Icon icon="more" size="16" className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => {
              // Get the CompletedTasksView component instance and call its export function
              // This is a placeholder - we'll need to implement a better way to handle this
              setExportDialogOpen(true);
            }}>
              <Icon icon="markdown" size="16" className="mr-2 h-4 w-4" />
              <span>导出筛选结果为 Markdown</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    } else if (selectedProject === "trash") {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              disabled={trashedLoading && !trashedLoaded}
            >
              <Icon icon="more" size="16" className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => setConfirmDeleteAll(true)}
              disabled={trashedLoading || !trashedLoaded || trashedTasks.length === 0}
            >
              <Icon icon="delete" size="16" className="mr-2 h-4 w-4" />
              <span>清空垃圾桶</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }
    return null;
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {showTopHeader && (
        <TaskHeader
          projectName={viewInfo.name}
          icon={viewInfo.icon}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          actions={renderHeaderActions()}
        />
      )}
      <div className="flex-1 overflow-hidden">
        {renderContent()}
      </div>

      {/* Confirm Empty Trash Dialog */}
      <AlertDialog open={confirmDeleteAll} onOpenChange={setConfirmDeleteAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认清空垃圾桶？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作将永久删除垃圾桶中的所有任务，无法恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEmptyTrash}
              disabled={trashedLoading || trashedTasks.length === 0}
            >
              确认清空
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TaskView;
