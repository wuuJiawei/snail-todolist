import React, { useState, useEffect, useMemo } from "react";
import { Check } from "lucide-react";
import { Task } from "@/types/task";
import { useTaskContext } from "@/contexts/task";
import TaskItem from "./TaskItem";
import CollapsibleTaskSection from "./CollapsibleTaskSection";
import { useProjectContext } from "@/contexts/ProjectContext";

interface CompletedTasksCollapsibleProps {
  projectId: string;
  showProject?: boolean;
}

const TASKS_PER_PAGE = 10;

const CompletedTasksCollapsible: React.FC<CompletedTasksCollapsibleProps> = ({
  projectId,
  showProject = false
}) => {
  const { tasks } = useTaskContext();
  const { projects } = useProjectContext();
  const [displayCount, setDisplayCount] = useState(TASKS_PER_PAGE);
  const [isLoading, setIsLoading] = useState(false);

  // 筛选并排序已完成任务
  const completedTasks = useMemo(() => {
    return tasks
      .filter(task => {
        // 根据项目筛选
        const matchesProject = projectId === task.project;
        
        // 只显示已完成的任务
        return matchesProject && task.completed && !task.deleted && !task.abandoned;
      })
      .sort((a, b) => {
        // 按完成时间倒序排序
        const timeA = a.completed_at ? new Date(a.completed_at).getTime() : 0;
        const timeB = b.completed_at ? new Date(b.completed_at).getTime() : 0;
        return timeB - timeA;
      });
  }, [tasks, projectId]);

  // 当前显示的任务
  const displayedTasks = completedTasks.slice(0, displayCount);
  const hasMore = displayCount < completedTasks.length;

  // 加载更多
  const handleLoadMore = async () => {
    if (isLoading || !hasMore) return;
    
    setIsLoading(true);
    
    // 模拟加载延迟
    await new Promise(resolve => setTimeout(resolve, 300));
    
    setDisplayCount(prev => Math.min(prev + TASKS_PER_PAGE, completedTasks.length));
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
      isDraggable={false} // 已完成任务不可拖拽
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