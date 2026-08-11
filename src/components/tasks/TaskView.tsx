import React, { useState } from "react";
import { useTaskContext } from "@/contexts/task";
import TaskHeader from "./TaskHeader";
import TaskList from "./TaskList";
import CompletedTasksView from "./CompletedTasksView";
import AbandonedTasksView from "./AbandonedTasksView";
import TrashView from "./TrashView";
import { useSidebar } from "@/contexts/SidebarContext";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon-park";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const TaskView: React.FC = () => {
  const {
    selectedProject,
    tasks,
    trashedTasks,
    abandonedTasks,
    trashedLoading,
    abandonedLoading,
    trashedLoaded,
    abandonedLoaded,
  } = useTaskContext();
  const { collapsed, setCollapsed } = useSidebar();
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  const showTopHeader = selectedProject === "completed" || selectedProject === "abandoned";

  const renderContent = () => {
    switch (selectedProject) {
      case "completed":
        return (
          <CompletedTasksView
            tasks={tasks.filter((task) => task.completed)}
            exportDialogOpen={exportDialogOpen}
            onExportDialogChange={setExportDialogOpen}
          />
        );
      case "abandoned":
        if (abandonedLoading && !abandonedLoaded) {
          return (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
              正在加载已放弃任务...
            </div>
          );
        }
        return <AbandonedTasksView tasks={abandonedTasks} />;
      case "trash":
        if (trashedLoading && !trashedLoaded && trashedTasks.length === 0) {
          return (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
              正在加载垃圾桶...
            </div>
          );
        }
        return <TrashView />;
      default:
        return <TaskList />;
    }
  };

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
      default:
        return { name: "所有任务", icon: "list" };
    }
  };

  const viewInfo = getViewInfo();

  const renderHeaderActions = () => {
    if (selectedProject !== "completed") return null;

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 px-2">
            <Icon icon="more" size="16" className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setExportDialogOpen(true)}>
            <Icon icon="markdown" size="16" className="mr-2 h-4 w-4" />
            <span>导出筛选结果为 Markdown</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      {showTopHeader && (
        <TaskHeader
          projectName={viewInfo.name}
          icon={viewInfo.icon}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          actions={renderHeaderActions()}
        />
      )}
      <div className="min-h-0 flex-1 overflow-hidden">{renderContent()}</div>
    </div>
  );
};

export default TaskView;
