
import React, { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ProjectIcon from "@/components/ui/project-icon";

interface TaskHeaderProps {
  projectName: string;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  icon?: string;
  iconColor?: string;
  actions?: ReactNode; // New prop for actions/more button
}

const TaskHeader: React.FC<TaskHeaderProps> = ({
  projectName,
  collapsed,
  setCollapsed,
  icon,
  iconColor = "#000000",
  actions
}) => {
  return (
    <div className="p-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
        <div className="flex items-center gap-2">
          <ProjectIcon icon={icon} color={iconColor} size={24} className="h-6 w-6" />
          <h1 className="text-2xl font-bold">{projectName}</h1>
        </div>
      </div>

      {/* Actions area on the right */}
      {actions && (
        <div className="flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
};

export default TaskHeader;
