import React, { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { CalendarIcon, ChevronDown, ChevronUp, RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import TaskItem from "@/components/tasks/TaskItem";
import { useProjectContext } from "@/contexts/ProjectContext";
import { Task } from "@/types/task";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import ProjectSelector from "@/components/tasks/ProjectSelector";
import { DateRange } from "react-day-picker";
import { COMPLETED_TASKS_FILTERS_KEY } from "@/constants/storage-keys";
import { Icon } from "@/components/ui/icon-park";

interface AbandonedTasksViewProps {
  tasks: Task[];
}

interface TaskGroup {
  date: string;
  tasks: Task[];
}

const ABANDONED_TASKS_FILTERS_KEY = "abandonedTasksFilters";

const AbandonedTasksView: React.FC<AbandonedTasksViewProps> = ({ tasks }) => {
  const { projects } = useProjectContext();
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  // Load saved date range from localStorage on component mount
  useEffect(() => {
    const savedFilters = localStorage.getItem(ABANDONED_TASKS_FILTERS_KEY);
    if (savedFilters) {
      try {
        const parsedFilters = JSON.parse(savedFilters);

        // Load date range
        if (parsedFilters.dateRange && parsedFilters.dateRange.from) {
          try {
            // Convert string dates back to Date objects
            const savedDateRange: DateRange = {
              from: parsedFilters.dateRange.from ? new Date(parsedFilters.dateRange.from) : undefined,
              to: parsedFilters.dateRange.to ? new Date(parsedFilters.dateRange.to) : undefined
            };

            // Verify dates are valid
            if (savedDateRange.from && !isNaN(savedDateRange.from.getTime())) {
              if (savedDateRange.to && isNaN(savedDateRange.to.getTime())) {
                savedDateRange.to = undefined;
              }
              setDateRange(savedDateRange);
            }
          } catch (dateError) {
            console.error("Error parsing saved date range:", dateError);
          }
        }
      } catch (error) {
        console.error("Error parsing saved filters:", error);
      }
    }
  }, []);

  // 过滤和分组任务
  const filteredAndGroupedTasks = React.useMemo(() => {
    return tasks
      .filter(task => {
        // 首先确保任务有放弃日期
        const abandonedDate = task.abandoned_at ? new Date(task.abandoned_at) : null;

        // 日期范围筛选
        const matchesDateRange =
          (!dateRange?.from || (abandonedDate && abandonedDate >= dateRange.from)) &&
          (!dateRange?.to || (abandonedDate && abandonedDate <= dateRange.to));

        // 项目筛选
        const matchesProjects =
          selectedProjects.length === 0 || selectedProjects.includes(task.project || "");

        return matchesDateRange && matchesProjects;
      })
      .reduce((groups: TaskGroup[], task) => {
        // 确保使用放弃日期而不是任务日期进行分组
        if (!task.abandoned_at) return groups; // 跳过没有放弃日期的任务

        const date = format(new Date(task.abandoned_at), "yyyy-MM-dd");
        const group = groups.find(g => g.date === date);

        if (group) {
          group.tasks.push(task);
        } else {
          groups.push({ date, tasks: [task] });
        }

        return groups;
      }, [])
      .sort((a, b) => b.date.localeCompare(a.date)); // 按日期降序排序
  }, [tasks, dateRange, selectedProjects]);

  const toggleGroup = (date: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  };

  const resetDateFilter = () => {
    setDateRange(undefined);
    saveDateRangeToLocalStorage(undefined);
    setDatePopoverOpen(false);
  };

  const resetAllFilters = () => {
    setDateRange(undefined);
    setSelectedProjects([]);
    saveDateRangeToLocalStorage(undefined);
    setDatePopoverOpen(false);
  };

  // Helper function to save date range to localStorage
  const saveDateRangeToLocalStorage = (dateRange: DateRange | undefined) => {
    const savedFilters = localStorage.getItem(ABANDONED_TASKS_FILTERS_KEY) || '{}';
    try {
      const parsedFilters = JSON.parse(savedFilters);
      const filtersToSave = {
        ...parsedFilters,
        dateRange: dateRange ? {
          from: dateRange.from?.toISOString(),
          to: dateRange.to?.toISOString()
        } : undefined
      };
      localStorage.setItem(ABANDONED_TASKS_FILTERS_KEY, JSON.stringify(filtersToSave));
    } catch (error) {
      console.error("Error saving date range to localStorage:", error);
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* 筛选和操作区域 */}
      <div className="flex flex-nowrap items-center gap-2 mb-3 overflow-x-auto pb-1.5 border-b border-border/40">
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 justify-start text-left font-normal w-[150px] truncate border-border/60 px-2",
                  !dateRange && "text-muted-foreground"
                )}
              >
                  <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        <span className="text-xs">{format(dateRange.from, "yyyy-MM-dd")}</span>
                        <span className="mx-1 text-muted-foreground">至</span>
                        <span className="text-xs">{format(dateRange.to, "yyyy-MM-dd")}</span>
                      </>
                    ) : (
                      <span className="text-xs">{format(dateRange.from, "yyyy-MM-dd")}</span>
                    )
                  ) : (
                    <span className="text-muted-foreground text-xs">选择日期范围</span>
                  )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  locale={zhCN}
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={(range) => {
                    setDateRange(range);
                    saveDateRangeToLocalStorage(range);
                    // setDatePopoverOpen(false); // Removed: Keep popover open after selection
                  }}
                  numberOfMonths={2}
                />
                <div className="p-2 border-t border-border/40 flex justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetDateFilter}
                    disabled={!dateRange}
                  >
                    <RefreshCcw className="mr-1.5 h-3 w-3" />
                    <span className="text-xs">重置</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      if (dateRange?.from && !dateRange.to) {
                        // 如果只选择了开始日期，设置结束日期为同一天
                        const newRange = {
                          from: dateRange.from,
                          to: dateRange.from
                        };
                        setDateRange(newRange);
                        saveDateRangeToLocalStorage(newRange);
                      }
                      // 关闭日期选择器弹窗
                      setDatePopoverOpen(false);
                    }}
                  >
                    <span className="text-xs">应用</span>
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

          {/* 多选项目筛选器 */}
          <ProjectSelector
            projects={projects}
            selectedProjects={selectedProjects}
            onChange={setSelectedProjects}
            storageKey={ABANDONED_TASKS_FILTERS_KEY + ".projects"}
            className="h-8"
          />

          {/* 重置所有筛选按钮 */}
          {(selectedProjects.length > 0 || dateRange) && (
            <Button
              variant="outline"
              size="sm"
              onClick={resetAllFilters}
              className="h-8 px-2 border-border/60"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              <span className="ml-1 text-xs">清除</span>
            </Button>
          )}
        </div>
      </div>

      {/* 任务列表 */}
      <ScrollArea className="h-[calc(100vh-180px)]" type="auto">
        <div className="space-y-4">
          {filteredAndGroupedTasks.length > 0 ? (
            filteredAndGroupedTasks.map(({ date, tasks }) => (
              <Collapsible
                key={date}
                open={expandedGroups.has(date)}
                onOpenChange={() => toggleGroup(date)}
              >
                <CollapsibleTrigger className="flex w-full items-center justify-between p-3 hover:bg-accent/30 rounded-md transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {format(new Date(date), "yyyy年MM月dd日", { locale: zhCN })}
                    </span>
                    <Badge variant="secondary" className="ml-1 text-xs">{tasks.length}</Badge>
                  </div>
                  {expandedGroups.has(date) ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-1.5 mt-1.5 pl-1">
                    {tasks.map((task) => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        showProject={true}
                        projectName={projects.find(p => p.id === task.project)?.name}
                      />
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))
          ) : (
            <div className="text-center py-12 px-4 text-muted-foreground">
              <div className="flex flex-col items-center gap-2">
                <RefreshCcw className="h-10 w-10 text-muted-foreground/50" />
                <p>未找到匹配条件的已放弃任务</p>
                <Button variant="outline" size="sm" onClick={resetAllFilters} className="mt-2">清除筛选条件</Button>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default AbandonedTasksView; 