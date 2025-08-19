
import React, { useState } from "react";
import { Task } from "@/types/task";
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface TasksExpiredProps {
  tasks: Task[];
  renderTask: (task: Task) => React.ReactNode;
}

const TasksExpired: React.FC<TasksExpiredProps> = ({ tasks, renderTask }) => {
  const [isOpen, setIsOpen] = useState(true);
  
  if (tasks.length === 0) return null;
  
  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="mb-4"
    >
      <div className="flex items-center px-4 py-2 bg-red-50 text-red-700 border-t border-b border-red-200">
        <CollapsibleTrigger className="flex items-center justify-between w-full">
          <div className="flex items-center">
            <AlertTriangle className="h-4 w-4 mr-2" />
            <span className="text-sm font-medium">已过期 ({tasks.length})</span>
          </div>
          {isOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent>
        <div className="pb-2">
          {tasks.map(task => renderTask(task))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default TasksExpired;
