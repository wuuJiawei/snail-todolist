import React from "react";
import AbandonedTasksView from "./AbandonedTasksView";
import CompletedTasksView from "./CompletedTasksView";
import TaskList from "./TaskList";
import TrashView from "./TrashView";
import { useTaskContext } from "@/contexts/task";

const TaskView: React.FC = () => {
  const { selectedProject, tasks, abandonedTasks, loading } = useTaskContext();

  const renderContent = () => {
    switch (selectedProject) {
      case "completed":
        return <CompletedTasksView tasks={tasks.filter((task) => task.completed)} loading={loading} />;
      case "abandoned":
        return <AbandonedTasksView tasks={abandonedTasks} />;
      case "trash":
        return <TrashView />;
      default:
        return <TaskList />;
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-hidden">{renderContent()}</div>
    </div>
  );
};

export default TaskView;
