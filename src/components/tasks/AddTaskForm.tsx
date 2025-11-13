import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Calendar, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { isValid, isBefore, startOfDay } from "date-fns";
import { formatDateText } from "@/utils/taskUtils";
import { cn } from "@/lib/utils";
import DueDatePickerContent from "./DueDatePickerContent";

interface AddTaskFormProps {
  onAddTask: (title: string, date?: Date) => Promise<void>;
  isSubmitting: boolean;
}

const AddTaskForm: React.FC<AddTaskFormProps> = ({ onAddTask, isSubmitting }) => {
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDate, setNewTaskDate] = useState<Date | undefined>(undefined);
  const isComposingRef = useRef(false);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isComposingRef.current) {
      return;
    }
    if (newTaskTitle.trim() && !isSubmitting) {
      await onAddTask(newTaskTitle, newTaskDate);
      setNewTaskTitle("");
      setNewTaskDate(undefined);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const composing = (e.nativeEvent as any)?.isComposing || (e as any)?.isComposing || (e as any)?.keyCode === 229 || isComposingRef.current;
      if (composing) {
        e.preventDefault();
        return;
      }
      handleAddTask(e as unknown as React.FormEvent);
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
          className="h-6 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm px-0"
          disabled={isSubmitting}
        />
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
