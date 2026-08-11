import React, { ReactNode, useState } from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { CalendarIcon, RefreshCcw } from "lucide-react";
import { DateRange } from "react-day-picker";
import ProjectSelector from "@/components/tasks/ProjectSelector";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Project } from "@/types/task";

interface ArchiveTaskFilterActionsProps {
  projects: Project[];
  storageKey: string;
  dateRange?: DateRange;
  selectedProjects: string[];
  onDateRangeChange: (range: DateRange | undefined) => void;
  onSelectedProjectsChange: (projectIds: string[]) => void;
  onClear: () => void;
  extraActions?: ReactNode;
}

export const ArchiveTaskFilterActions: React.FC<ArchiveTaskFilterActionsProps> = ({
  projects,
  storageKey,
  dateRange,
  selectedProjects,
  onDateRangeChange,
  onSelectedProjectsChange,
  onClear,
  extraActions,
}) => {
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const filterActive = Boolean(dateRange || selectedProjects.length > 0);

  return (
    <>
      <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "w-[150px] justify-start bg-background/85 text-left font-normal backdrop-blur-sm",
              !dateRange && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
            {dateRange?.from ? (
              <span className="truncate text-xs">
                {format(dateRange.from, "yyyy-MM-dd")}
                {dateRange.to && ` 至 ${format(dateRange.to, "yyyy-MM-dd")}`}
              </span>
            ) : (
              <span className="text-xs">选择日期范围</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            initialFocus
            locale={zhCN}
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={onDateRangeChange}
            numberOfMonths={2}
          />
          <div className="flex justify-between border-t border-border/40 p-2">
            <Button variant="outline" size="sm" onClick={() => onDateRangeChange(undefined)} disabled={!dateRange}>
              <RefreshCcw className="mr-1.5 h-3 w-3" />
              <span className="text-xs">重置</span>
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (dateRange?.from && !dateRange.to) {
                  onDateRangeChange({ from: dateRange.from, to: dateRange.from });
                }
                setDatePopoverOpen(false);
              }}
            >
              <span className="text-xs">应用</span>
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <ProjectSelector
        projects={projects}
        selectedProjects={selectedProjects}
        onChange={onSelectedProjectsChange}
        storageKey={`${storageKey}.projects`}
        className="relative h-9 min-w-[150px] bg-background/85 backdrop-blur-sm"
      />

      {filterActive && (
        <Button
          variant="outline"
          size="sm"
          onClick={onClear}
          className="bg-background/85 backdrop-blur-sm"
        >
          <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
          清除筛选
        </Button>
      )}

      {extraActions}
    </>
  );
};
