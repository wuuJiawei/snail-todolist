import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Calendar } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { addDays, subDays, isValid, isBefore, startOfDay } from "date-fns";
import { formatDateText } from "@/utils/taskUtils";
import { zhCN } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface AddTaskFormProps {
  onAddTask: (title: string, date?: Date) => Promise<void>;
  isSubmitting: boolean;
}

const AddTaskForm: React.FC<AddTaskFormProps> = ({ onAddTask, isSubmitting }) => {
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDate, setNewTaskDate] = useState<Date | undefined>(undefined);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newTaskTitle.trim() && !isSubmitting) {
      await onAddTask(newTaskTitle, newTaskDate);
      setNewTaskTitle("");
      setNewTaskDate(undefined);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAddTask(e as React.FormEvent);
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
        <Plus className="h-5 w-5 text-gray-400" />
        <Input
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          onKeyDown={handleKeyDown}
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
            <div className="p-2 flex flex-row gap-1">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setNewTaskDate(new Date())}
                className="justify-start"
              >
                今天
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setNewTaskDate(addDays(new Date(), 1))}
                className="justify-start"
              >
                明天
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setNewTaskDate(subDays(new Date(), 1))}
                className="justify-start"
              >
                昨天
              </Button>
              {newTaskDate && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setNewTaskDate(undefined)}
                  className="justify-start text-red-500 hover:text-red-600"
                >
                  移除日期
                </Button>
              )}
            </div>
            <CalendarComponent
              mode="single"
              selected={newTaskDate}
              onSelect={setNewTaskDate}
              className="rounded-md border pointer-events-auto"
              locale={zhCN}
            />
          </PopoverContent>
        </Popover>
      </form>
    </div>
  );
};

export default AddTaskForm;
