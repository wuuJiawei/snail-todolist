import React from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon-park";

interface EmptyStateGuideProps {
  viewType: "today" | "recent" | "flagged";
  onCreateProject: () => void;
  hasProjects: boolean;
}

const viewConfig = {
  today: {
    icon: "calendar-dot",
    title: "今天没有待办任务",
    descriptionWithProjects: "在清单中添加任务并设置截止日期为今天，任务就会出现在这里",
    descriptionNoProjects: "先创建一个清单，然后添加任务并设置截止日期",
  },
  recent: {
    icon: "calendar",
    title: "最近 7 天没有待办任务",
    descriptionWithProjects: "在清单中添加任务并设置截止日期，任务就会出现在这里",
    descriptionNoProjects: "先创建一个清单，然后添加任务并设置截止日期",
  },
  flagged: {
    icon: "flag",
    title: "没有标记的任务",
    descriptionWithProjects: "在任务上点击旗帜图标进行标记，标记的任务会出现在这里",
    descriptionNoProjects: "先创建一个清单和任务，然后标记重要的任务",
  },
};

const EmptyStateGuide: React.FC<EmptyStateGuideProps> = ({
  viewType,
  onCreateProject,
  hasProjects,
}) => {
  const config = viewConfig[viewType];

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
        <Icon icon={config.icon} size="32" className="text-muted-foreground" />
      </div>
      <h3 className="text-base font-medium text-foreground mb-2">
        {config.title}
      </h3>
      <p className="text-sm text-muted-foreground text-center max-w-xs mb-6">
        {hasProjects ? config.descriptionWithProjects : config.descriptionNoProjects}
      </p>
      {!hasProjects && (
        <Button
          variant="outline"
          size="sm"
          onClick={onCreateProject}
          className="gap-2"
        >
          <Icon icon="add" size="16" />
          创建清单
        </Button>
      )}
    </div>
  );
};

export default EmptyStateGuide;
