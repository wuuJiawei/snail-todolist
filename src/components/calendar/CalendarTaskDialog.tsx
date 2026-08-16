import { useState } from "react";

import AddTaskForm from "@/components/tasks/AddTaskForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useProjectContext } from "@/contexts/ProjectContext";
import { useTaskContext } from "@/contexts/task";
import { serializeTaskDateValue, type TaskDateValue } from "@/utils/taskDate";

interface CalendarTaskDialogProps {
  open: boolean;
  initialDate: TaskDateValue;
  onOpenChange: (open: boolean) => void;
}

const CalendarTaskDialog = ({ open, initialDate, onOpenChange }: CalendarTaskDialogProps) => {
  const { addTask } = useTaskContext();
  const { projects } = useProjectContext();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddTask = async (title: string, date: TaskDateValue, projectId?: string) => {
    if (!projectId) return;
    setIsSubmitting(true);
    try {
      await addTask({
        title,
        completed: false,
        project: projectId,
        ...serializeTaskDateValue(date),
      });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>新建日程任务</DialogTitle>
          <DialogDescription>选择清单并设置日期、具体时间或时间段。</DialogDescription>
        </DialogHeader>
        <AddTaskForm
          key={open ? `${initialDate?.type}-${initialDate?.start.toISOString()}` : "closed"}
          onAddTask={handleAddTask}
          isSubmitting={isSubmitting}
          defaultDateValue={initialDate}
          projectSelection={{ projects, required: true }}
        />
      </DialogContent>
    </Dialog>
  );
};

export default CalendarTaskDialog;
