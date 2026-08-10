import React, { useState, useEffect, useMemo } from "react";
import { XCircle } from "lucide-react";
import { Task } from "@/types/task";
import { useTaskContext } from "@/contexts/task";
import TaskItem from "./TaskItem";
import CollapsibleTaskSection from "./CollapsibleTaskSection";
import { useProjectContext } from "@/contexts/ProjectContext";
import { filterTasksBySearch } from "@/utils/taskSearch";

interface AbandonedTasksCollapsibleProps {
  projectId: string;
  showProject?: boolean;
  searchQuery?: string;
}

const TASKS_PER_PAGE = 10;

const AbandonedTasksCollapsible: React.FC<AbandonedTasksCollapsibleProps> = ({
  projectId,
  showProject = false,
  searchQuery = "",
}) => {
  const {
    abandonedTasks,
    abandonedLoaded,
    abandonedLoading,
    loadAbandonedTasks,
  } = useTaskContext();
  const { projects } = useProjectContext();
  const [displayCount, setDisplayCount] = useState(TASKS_PER_PAGE);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!abandonedLoaded && !abandonedLoading) {
      loadAbandonedTasks().catch((error) => {
        console.error("Failed to load abandoned tasks:", error);
      });
    }
  }, [abandonedLoaded, abandonedLoading, loadAbandonedTasks]);

  // 筛选并排序已放弃任务；搜索只作用于当前清单。
  const filteredAbandonedTasks = useMemo(() => {
    const projectAbandonedTasks = abandonedTasks.filter(task => {
      const matchesProject = projectId === task.project;
      return matchesProject && task.abandoned && !task.deleted;
    });

    return filterTasksBySearch(projectAbandonedTasks, searchQuery)
      .sort((a, b) => {
        const timeA = a.abandoned_at ? new Date(a.abandoned_at).getTime() : 0;
        const timeB = b.abandoned_at ? new Date(b.abandoned_at).getTime() : 0;
        return timeB - timeA;
      });
  }, [abandonedTasks, projectId, searchQuery]);

  const displayedTasks = filteredAbandonedTasks.slice(0, displayCount);
  const hasMore = displayCount < filteredAbandonedTasks.length;

  const handleLoadMore = async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 300));
    setDisplayCount(prev => Math.min(prev + TASKS_PER_PAGE, filteredAbandonedTasks.length));
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
      title="已放弃"
      tasks={filteredAbandonedTasks}
      icon={<XCircle className="h-4 w-4" />}
      variant="abandoned"
      onLoadMore={handleLoadMore}
      hasMore={hasMore}
      isLoading={isLoading}
      displayedCount={displayCount}
    >
      {displayedTasks.map(renderTask)}
    </CollapsibleTaskSection>
  );
};

export default AbandonedTasksCollapsible;
