import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { Task } from "@/types/task";

interface CalendarMoreDialogProps {
  date?: Date;
  open: boolean;
  tasks: Task[];
  onOpenChange: (open: boolean) => void;
  onOpenTask: (task: Task) => void;
  onToggleTask: (task: Task, completed: boolean) => Promise<void>;
}

const CalendarMoreDialog = ({
  date,
  open,
  tasks,
  onOpenChange,
  onOpenTask,
  onToggleTask,
}: CalendarMoreDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
      <DialogHeader className="border-b px-6 py-5 pr-12">
        <DialogTitle>
          {date ? format(date, "M月d日 EEEE", { locale: zhCN }) : "当日任务"}
        </DialogTitle>
        <DialogDescription>共 {tasks.length} 项任务</DialogDescription>
      </DialogHeader>

      <ScrollArea className="max-h-[min(28rem,calc(100vh-12rem))]">
        <div className="p-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="group flex min-h-12 items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-accent"
            >
              <Checkbox
                checked={task.completed}
                onCheckedChange={(checked) => void onToggleTask(task, checked === true)}
                aria-label={task.completed ? `将“${task.title}”标记为未完成` : `将“${task.title}”标记为已完成`}
                className="shrink-0"
              />
              <button
                type="button"
                onClick={() => onOpenTask(task)}
                className={cn(
                  "min-w-0 flex-1 rounded-sm text-left text-sm leading-5 outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  task.completed && "text-muted-foreground line-through",
                )}
              >
                {task.title}
              </button>
            </div>
          ))}
        </div>
      </ScrollArea>
    </DialogContent>
  </Dialog>
);

export default CalendarMoreDialog;
