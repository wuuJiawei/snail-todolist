
import React, { ReactNode } from "react";
import ProjectIcon from "@/components/ui/project-icon";
import TaskPageHero from "@/components/tasks/TaskPageHero";

interface TaskHeaderProps {
  projectName: string;
  icon?: string;
  iconColor?: string;
  actions?: ReactNode;
  heroImage?: string;
  compactHero?: boolean;
  heroImagePosition?: string;
}

const TaskHeader: React.FC<TaskHeaderProps> = ({
  projectName,
  icon,
  iconColor = "#000000",
  actions,
  heroImage,
  compactHero = false,
  heroImagePosition,
}) => {
  if (heroImage) {
    return (
      <TaskPageHero
        title={projectName}
        titleIcon={
          <ProjectIcon icon={icon} color={iconColor} size={24} className="h-6 w-6" />
        }
        heroImage={heroImage}
        actions={actions}
        compact={compactHero}
        imagePosition={heroImagePosition}
      />
    );
  }

  return (
    <div className="p-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <ProjectIcon icon={icon} color={iconColor} size={24} className="h-6 w-6" />
        <h1 className="text-2xl font-bold">{projectName}</h1>
      </div>

      {actions && (
        <div className="flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
};

export default TaskHeader;
