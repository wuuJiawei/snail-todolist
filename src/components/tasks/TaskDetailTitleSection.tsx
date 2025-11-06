import React from "react";
import { Textarea } from "@/components/ui/textarea";
import TagSelector from "./TagSelector";
import type { Task } from "@/types/task";

export interface TaskDetailTitleSectionProps {
  title: string;
  titleRef: React.RefObject<HTMLTextAreaElement>;
  isTaskInTrash: boolean;
  onTitleChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onCompositionStart: () => void;
  onCompositionEnd: (event: React.CompositionEvent<HTMLTextAreaElement>) => void;
  selectedTask: Task;
  completedAtLabel: string;
  deletedAtLabel: string;
}

const TaskDetailTitleSection: React.FC<TaskDetailTitleSectionProps> = ({
  title,
  titleRef,
  isTaskInTrash,
  onTitleChange,
  onCompositionStart,
  onCompositionEnd,
  selectedTask,
  completedAtLabel,
  deletedAtLabel,
}) => {
  return (
    <div className="space-y-0">
      <div className="flex items-center gap-3">
        {isTaskInTrash ? (
          <div className="flex-1 text-lg font-medium px-3 min-h-[40px] py-2 overflow-hidden">
            {title}
          </div>
        ) : (
          <Textarea
            ref={titleRef}
            value={title}
            onChange={onTitleChange}
            onCompositionStart={onCompositionStart}
            onCompositionEnd={onCompositionEnd}
            className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-lg font-medium px-3 min-h-[32px] resize-none overflow-hidden"
            placeholder="任务标题"
            onInput={(event) => {
              const target = event.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = `${target.scrollHeight}px`;
            }}
          />
        )}
      </div>
      <div className="px-3 py-1">
        <TagSelector taskId={selectedTask.id} projectId={selectedTask.project ?? null} readOnly={isTaskInTrash} />
      </div>
      <div className="text-xs text-gray-500 ml-1 mt-1 space-y-1">
        {completedAtLabel && <div>{completedAtLabel}</div>}
        {deletedAtLabel && <div className="text-amber-600">{deletedAtLabel}</div>}
      </div>
    </div>
  );
};

export default TaskDetailTitleSection;

