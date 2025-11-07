import React, { useEffect } from "react";
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
  useEffect(() => {
    if (titleRef.current) {
      const el = titleRef.current;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [title, titleRef]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        {isTaskInTrash ? (
          <div className="flex-1 text-base font-medium leading-tight">
            {title}
          </div>
        ) : (
          <Textarea
            ref={titleRef}
            value={title}
            onChange={onTitleChange}
            onCompositionStart={onCompositionStart}
            onCompositionEnd={onCompositionEnd}
            className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-base font-semibold px-0 py-0.5 min-h-0 resize-none overflow-hidden bg-transparent leading-tight"
            placeholder="任务标题"
            onInput={(event) => {
              const target = event.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = `${target.scrollHeight}px`;
            }}
          />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 min-h-[24px]">
        <TagSelector taskId={selectedTask.id} projectId={selectedTask.project ?? null} readOnly={isTaskInTrash} />
      </div>

      <div className="text-xs text-muted-foreground space-y-0.5">
        {completedAtLabel && <div>{completedAtLabel}</div>}
        {deletedAtLabel && <div className="text-amber-600">{deletedAtLabel}</div>}
      </div>
    </div>
  );
};

export default TaskDetailTitleSection;

