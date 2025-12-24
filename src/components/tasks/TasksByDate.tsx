
import React from "react";
import { Task } from "@/types/task";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface TasksByDateProps {
  tasksByDate: Record<string, Task[]>;
  renderTask: (task: Task) => React.ReactNode;
  showEmptyMessage: boolean;
}

const TasksByDate: React.FC<TasksByDateProps> = ({ 
  tasksByDate, 
  renderTask, 
  showEmptyMessage 
}) => {
  const dateGroupsExist = Object.keys(tasksByDate).length > 0;
  // Create a state object to track the open/closed state of each date group
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    // Initialize all groups as open by default
    const initialOpenState: Record<string, boolean> = {};
    Object.keys(tasksByDate).forEach(date => {
      initialOpenState[date] = true;
    });
    return initialOpenState;
  });
  
  // Toggle function for a specific date group
  const toggleGroup = (date: string) => {
    setOpenGroups(prev => ({
      ...prev,
      [date]: !prev[date]
    }));
  };
  
  if (!dateGroupsExist && showEmptyMessage) {
    return (
      <div className="p-4">
        <Alert>
          <AlertDescription>
            暂无待办任务
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  if (!dateGroupsExist) return null;
  
  return (
    <>
      {Object.entries(tasksByDate).map(([date, tasksForDate]) => (
        <Collapsible 
          key={date} 
          open={openGroups[date]} 
          onOpenChange={() => toggleGroup(date)}
          className="mb-2"
        >
          <div className="px-4 py-2 bg-gray-50 text-gray-700 border-t border-b border-gray-200">
            <CollapsibleTrigger className="flex items-center justify-between w-full">
              <span className="text-sm font-medium">{date} ({tasksForDate.length})</span>
              {openGroups[date] ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <div className="pb-2">
              {tasksForDate.map(task => renderTask(task))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ))}
    </>
  );
};

export default TasksByDate;
