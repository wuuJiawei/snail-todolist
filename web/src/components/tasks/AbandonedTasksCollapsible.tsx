import React, { useState, useEffect, useMemo } from "react";
import { XCircle } from "lucide-react";
import { Task } from "@/types/task";
import { useTaskContext } from "@/contexts/task";
import TaskItem from "./TaskItem";
import CollapsibleTaskSection from "./CollapsibleTaskSection";
import { useProjectContext } from "@/contexts/ProjectContext";

interface AbandonedTasksCollapsibleProps {
  projectId: string;
  showProject?: boolean;
}

const TASKS_PER_PAGE = 10;

const AbandonedTasksCollapsible: React.FC<AbandonedTasksCollapsibleProps> = ({
  projectId,
  showProject = false
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

  // 筛选并排序已放弃任务
  const filteredAbandonedTasks = useMemo(() => {
    return abandonedTasks
      .filter(task => {
        // 根据项目筛选
        const matchesProject = projectId === task.project;
        
        // 只显示已放弃的任务（不包括已删除的）
        return matchesProject && task.abandoned && !task.deleted;
      })
      .sort((a, b) => {
        // 按放弃时间倒序排序
        const timeA = a.abandoned_at ? new Date(a.abandoned_at).getTime() : 0;
        const timeB = b.abandoned_at ? new Date(b.abandoned_at).getTime() : 0;
        return timeB - timeA;
      });
  }, [abandonedTasks, projectId]);

  // 当前显示的任务
  const displayedTasks = filteredAbandonedTasks.slice(0, displayCount);
  const hasMore = displayCount < filteredAbandonedTasks.length;

  // 加载更多
  const handleLoadMore = async () => {
    if (isLoading || !hasMore) return;
    
    setIsLoading(true);
    
    // 模拟加载延迟
    await new Promise(resolve => setTimeout(resolve, 300));
    
    setDisplayCount(prev => Math.min(prev + TASKS_PER_PAGE, filteredAbandonedTasks.length));
    setIsLoading(false);
  };

  // 重置显示数量当项目改变时
  useEffect(() => {
    setDisplayCount(TASKS_PER_PAGE);
  }, [projectId]);

  // 获取项目名称
  const getProjectName = (taskProjectId?: string) => {
    if (!taskProjectId) return "";
    const project = projects.find(p => p.id === taskProjectId);
    return project?.name || taskProjectId;
  };

  // 渲染任务项
  const renderTask = (task: Task) => (
    <TaskItem
      key={task.id}
      task={task}
      showProject={showProject}
      projectName={showProject ? getProjectName(task.project) : undefined}
      isDraggable={false} // 已放弃任务不可拖拽
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