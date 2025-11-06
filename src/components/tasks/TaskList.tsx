import React, { useState, useEffect } from "react";
import { useTaskContext } from "@/contexts/task";
import { useProjectContext } from "@/contexts/ProjectContext";
import { Task } from "@/types/task";
import TaskItem from "@/components/tasks/TaskItem";
import { Loader2 } from "lucide-react";
import { DragDropContext, Droppable, DropResult } from "@hello-pangea/dnd";
import { useSidebar } from "@/contexts/SidebarContext";
import { useTasksFilter } from "@/hooks/useTasksFilter";
import { useTaskFilter } from "@/hooks/useTaskFilter";
import { cn } from "@/lib/utils";
import ProjectSelector from "@/components/tasks/ProjectSelector";
import { TODAY_TASKS_FILTERS_KEY, RECENT_TASKS_FILTERS_KEY } from "@/constants/storage-keys";
import { Icon } from "@/components/ui/icon-park";
import { Button } from "@/components/ui/button";
import TaskFilter, { TaskFilterOptions } from "@/components/tasks/TaskFilter";
import TaskListSkeleton from "@/components/tasks/TaskListSkeleton";

// Import the extracted components
import TaskHeader from "./TaskHeader";
import AddTaskForm from "./AddTaskForm";
import TasksExpired from "./TasksExpired";
import TasksByDate from "./TasksByDate";
import TasksCompleted from "./TasksCompleted";
import CompletedTasksCollapsible from "./CompletedTasksCollapsible";
import AbandonedTasksCollapsible from "./AbandonedTasksCollapsible";

const TaskList: React.FC = () => {
  const { tasks, loading, selectedProject, addTask, reorderTasks } = useTaskContext();
  const { projects } = useProjectContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { collapsed, setCollapsed } = useSidebar();
  const [filteredProjects, setFilteredProjects] = useState<string[]>([]);
  
  // 任务筛选状态
  const [taskFilters, setTaskFilters] = useState<TaskFilterOptions>({
    status: [],
    deadline: [],
    hasAttachments: null,
  });

  // 根据当前视图选择合适的存储键
  const getStorageKey = () => {
    if (selectedProject === "today") return TODAY_TASKS_FILTERS_KEY;
    if (selectedProject === "recent") return RECENT_TASKS_FILTERS_KEY;
    return null;
  };

  // 当视图切换时重置筛选条件
  useEffect(() => {
    // 清空筛选条件，让存储键决定是否加载保存的选择
    setFilteredProjects([]);
  }, [selectedProject]);

  // Use the hook to filter and group tasks
  const {
    expiredTasks,
    pendingTasksByDate,
    completedTasks,
    pendingTasks,
    isSpecialView
  } = useTasksFilter(tasks, selectedProject, filteredProjects);

  // 应用任务筛选
  const { filteredTasks: filteredPendingTasks, activeFilterCount } = useTaskFilter(pendingTasks || [], taskFilters);
  const { filteredTasks: filteredCompletedTasks } = useTaskFilter(completedTasks || [], taskFilters);
  const { filteredTasks: filteredExpiredTasks } = useTaskFilter(expiredTasks || [], taskFilters);
  const { filteredTasks: filteredPendingTasksByDate } = useTaskFilter(pendingTasksByDate || {}, taskFilters);

  // Find the project and its details corresponding to the selected project ID
  const projectDetails = (() => {
    // 首先检查是否是固定项目
    if (selectedProject === "recent") {
      return {
        name: "最近7天",
        icon: "calendar",
        color: "#2196F3" // 使用蓝色作为默认颜色
      };
    }
    if (selectedProject === "today") {
      return {
        name: "今天",
        icon: "calendar-days",
        color: "#4CAF50" // 使用绿色作为默认颜色
      };
    }

    // 然后查找自定义项目
    const project = projects.find(project => project.id === selectedProject);
    if (project) {
      return {
        name: project.name,
        icon: project.icon,
        color: project.color
      };
    }

    return {
      name: selectedProject,
      icon: "folder",
      color: "#000000"
    };
  })();

  // Function to get project name from project ID
  const getProjectName = (projectId: string | undefined) => {
    if (!projectId) return "";

    const project = projects.find(p => p.id === projectId);
    if (project) return project.name;

    return projectId;
  };

  const handleAddTask = async (title: string, date?: Date) => {
    setIsSubmitting(true);

    try {
      // Convert date to ISO string if it exists
      const dateString = date ? date.toISOString() : undefined;

      await addTask({
        title: title,
        completed: false,
        project: selectedProject,
        date: dateString,
      });
    } catch (error) {
      console.error("Failed to add task:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if the current project allows task sorting
  const allowSorting = !isSpecialView && selectedProject !== "completed" && selectedProject !== "today" && selectedProject !== "recent";

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    // Only reorder tasks if:
    // 1. We have a valid destination
    // 2. Source and destination are the same droppable area (pending or completed)
    // 3. The current project allows sorting
    if (result.destination.droppableId === result.source.droppableId && allowSorting) {
      const isCompletedArea = result.source.droppableId === "completed-tasks";
      reorderTasks(selectedProject, sourceIndex, destinationIndex, isCompletedArea);
    }
  };

  // Custom task renderer to show project name for special views
  const renderTask = (task: Task, index?: number, isDraggable = false) => (
    <TaskItem
      key={task.id}
      task={task}
      showProject={isSpecialView}
      projectName={isSpecialView ? getProjectName(task.project) : undefined}
      index={index}
      isDraggable={isDraggable}
    />
  );

  if (loading) {
    return <TaskListSkeleton />;
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-screen">
      <TaskHeader
        projectName={projectDetails.name}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        icon={projectDetails.icon}
        iconColor={projectDetails.color}
        actions={
          <TaskFilter
            filters={taskFilters}
            onFiltersChange={setTaskFilters}
            activeCount={activeFilterCount}
          />
        }
      />

      {/* 在"今天"和"最迗7天"视图中添加项目选择器 */}
      {(selectedProject === "today" || selectedProject === "recent") && (
        <div className="px-4 py-3 border-b border-border/30">
          <div className="flex items-center mb-1">
            <span className="text-xs text-muted-foreground">按清单筛选：</span>
          </div>
          <ProjectSelector
            projects={projects}
            selectedProjects={filteredProjects}
            onChange={setFilteredProjects}
            storageKey={getStorageKey()}
            className="w-full max-w-full"
          />
        </div>
      )}

      <AddTaskForm
        onAddTask={handleAddTask}
        isSubmitting={isSubmitting}
      />

      {/* 主要内容区域 - 减少底部边距为固定底部列表留空间 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex-1 overflow-y-auto custom-scrollbar pb-4">
            {isSpecialView ? (
              <>
                <TasksExpired
                  tasks={filteredExpiredTasks}
                  renderTask={renderTask}
                />

                <TasksByDate
                  tasksByDate={filteredPendingTasksByDate as { [key: string]: Task[] }}
                  renderTask={renderTask}
                  showEmptyMessage={filteredExpiredTasks.length === 0}
                />
                
                {/* 特殊视图中显示已完成任务的旧样式 */}
                {filteredCompletedTasks.length > 0 && (
                  <div className="mt-4">
                    <TasksCompleted
                      tasks={filteredCompletedTasks}
                      renderTask={renderTask}
                      allowSorting={allowSorting}
                    />
                  </div>
                )}
              </>
            ) : (
              <>
                {filteredPendingTasks && filteredPendingTasks.length > 0 ? (
                  <Droppable droppableId="pending-tasks" isDropDisabled={!allowSorting}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          "pb-2",
                          snapshot.isDraggingOver && allowSorting && "bg-gray-50 rounded-md"
                        )}
                      >
                        {filteredPendingTasks.map((task, index) => (
                          <div className="px-4" key={task.id}>
                            {renderTask(task, index, allowSorting)}
                          </div>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                ) : (
                  <div className="text-center p-4 text-gray-500">
                    {activeFilterCount > 0 ? "没有符合筛选条件的任务" : "暂无待办任务"}
                  </div>
                )}
              </>
            )}
          </div>
        </DragDropContext>

        {/* 固定在底部的已完成和已放弃任务列表 - 只在非特殊视图中显示 */}
        {!isSpecialView && (
          <div className="flex-shrink-0">
            <CompletedTasksCollapsible 
              projectId={selectedProject}
              showProject={isSpecialView}
            />
            <AbandonedTasksCollapsible 
              projectId={selectedProject} 
              showProject={isSpecialView}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskList;
