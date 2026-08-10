import React, { useState, useEffect, useMemo } from "react";
import { Check } from "lucide-react";
import { Task } from "@/types/task";
import { useTaskContext } from "@/contexts/task";
import TaskItem from "./TaskItem";
import CollapsibleTaskSection from "./CollapsibleTaskSection";
import { useProjectContext } from "@/contexts/ProjectContext";
import { filterTasksBySearch } from "@/utils/taskSearch";

interface CompletedTasksCollapsibleProps {
  projectId: string;
  showProject?: boolean;
  searchQuery?: string;
}

const TASKS_PER_PAGE = 10;

const CompletedTasksCollapsible: React.FC<CompletedTasksCollapsibleProps> = ({
  projectId,
  showProject = false,
  searchQuery = "",
}) => {
  const { tasks } = useTaskContext();
  const { projects } = useProjectContext();
  const [displayCount, setDisplayCount] = useState(TASKS_PER_PAGE);
  const [isLoading, setIsLoading] = useState(false);

  // 筛选并排序已完成任务；搜索只作用于当前清单。
  const completedTasks = useMemo(() => {
    const projectCompletedTasks = tasks.filter(task => {
      const matchesProject = projectId === task.project;
      return matchesProject && task.completed && !task.deleted && !task.abandoned;
    });

    return filterTasksBySearch(projectCompletedTasks, searchQuery)
      .sort((a, b) => {
        const timeA = a.completed_at ? new Date(a.completed_at).getTime() : 0;
        const timeB = b.completed_at ? new Date(b.completed_at).getTime() : 0;
        return timeB - timeA;
      });
  }, [tasks, projectId, searchQuery]);

  const displayedTasks = completedTasks.slice(0, displayCount);
  const hasMore = displayCount < completedTasks.length;

  const handleLoadMore = async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 300));
    setDisplayCount(prev => Math.min(prev + TASKS_PER_PAGE, completedTasks.length));
    setIsLoading(false);
  };

  useEffect(() => {
    setDisplayCount(TASKS_PER_PAGE);
  }, [projectId, searchQuery]);

  const getProjectName = (taskProjectId?: string) => {
    if (!taskProjectId) return "";
    const project = projects.find(p => p.id === taskProjectId);
    return project?.name || taskProjectId;
  };

  const renderTask = (task: Task) => (
    <TaskItem
      key={task.id}
      task={task}
      showProject={showProject}
      projectName={showProject ? getProjectName(task.project) : undefined}
      isDraggable={false}
    />
  );

  return (
    <CollapsibleTaskSection
      title="已完成"
      tasks={completedTasks}
      icon={<Check className="h-4 w-4" />}
      variant="completed"
      onLoadMore={handleLoadMore}
      hasMore={hasMore}
      isLoading={isLoading}
      displayedCount={displayCount}
    >
      {displayedTasks.map(renderTask)}
    </CollapsibleTaskSection>
  );
};

export default CompletedTasksCollapsible;
