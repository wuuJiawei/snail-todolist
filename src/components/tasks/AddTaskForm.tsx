import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Calendar, Folder, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isValid, isBefore, startOfDay } from "date-fns";
import { formatDateText } from "@/utils/taskUtils";
import { cn } from "@/lib/utils";
import type { Project } from "@/types/project";
import DueDatePickerContent from "./DueDatePickerContent";

interface ProjectSelectionConfig {
  projects: Project[];
  required?: boolean;
}

interface AddTaskFormProps {
  onAddTask: (title: string, date?: Date, projectId?: string) => Promise<void>;
  isSubmitting: boolean;
  defaultDate?: Date;
  projectSelection?: ProjectSelectionConfig;
}

const AddTaskForm: React.FC<AddTaskFormProps> = ({
  onAddTask,
  isSubmitting,
  defaultDate,
  projectSelection,
}) => {
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDate, setNewTaskDate] = useState<Date | undefined>(defaultDate);
  const [selectedProjectId, setSelectedProjectId] = useState<string>();
  const [projectError, setProjectError] = useState(false);
  const isComposingRef = useRef(false);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isComposingRef.current) {
      return;
    }
    if (!newTaskTitle.trim() || isSubmitting) {
      return;
    }

    const hasValidProject = !projectSelection || (
      selectedProjectId && projectSelection.projects.some((project) => project.id === selectedProjectId)
    );
    if (projectSelection?.required && !hasValidProject) {
      setProjectError(true);
      return;
    }

    await onAddTask(newTaskTitle, newTaskDate, selectedProjectId);
    setNewTaskTitle("");
    setNewTaskDate(defaultDate);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const composing = e.nativeEvent.isComposing || e.nativeEvent.keyCode === 229 || isComposingRef.current;
      if (composing) {
        e.preventDefault();
      }
    }
  };

  const isDateExpired = (date?: Date) => {
    if (!date || !isValid(date)) return false;
    const today = startOfDay(new Date());
    return isBefore(date, today);
  };

  return (
    <div className="px-4 py-2">
      <form onSubmit={handleAddTask} className="flex items-center gap-2 bg-gray-50 rounded-lg px-2 py-2 border border-gray-50 hover:border hover:border-black">
        {isSubmitting ? (
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        ) : (
          <Plus className="h-5 w-5 text-gray-400" />
        )}
        <Input
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => { isComposingRef.current = true; }}
          onCompositionEnd={() => { isComposingRef.current = false; }}
          placeholder="添加任务"
          className="h-6 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm font-medium px-0"
          disabled={isSubmitting}
        />
        {projectSelection && (
          <Select
            value={selectedProjectId}
            onValueChange={(projectId) => {
              setSelectedProjectId(projectId);
              setProjectError(false);
            }}
            disabled={isSubmitting || projectSelection.projects.length === 0}
          >
            <SelectTrigger
              aria-label="选择清单"
              aria-required={projectSelection.required}
              aria-invalid={projectError}
              className={cn(
                "h-7 w-[148px] shrink-0 gap-1 border-0 bg-transparent px-2 text-xs shadow-none focus:ring-1 focus:ring-offset-0",
                projectError && "text-destructive ring-1 ring-destructive",
              )}
            >
              <Folder className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <SelectValue placeholder={projectSelection.projects.length > 0 ? "选择清单" : "暂无清单"} />
            </SelectTrigger>
            <SelectContent align="end">
              {projectSelection.projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className={cn(
                "h-6 px-2 text-xs hover:bg-transparent flex items-center gap-1",
                newTaskDate && (isDateExpired(newTaskDate) ? "text-red-500" : "text-green-600"),
                !newTaskDate && "text-gray-500"
              )}
              disabled={isSubmitting}
            >
              <Calendar className="h-4 w-4" />
              {newTaskDate && (
                <span>{formatDateText(newTaskDate)}</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <DueDatePickerContent
              selectedDate={newTaskDate}
              onChange={setNewTaskDate}
              removeLabel="移除日期"
            />
          </PopoverContent>
        </Popover>
      </form>
    </div>
  );
};

export default AddTaskForm;
