
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

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface CompletedTasksViewProps {
  tasks: Task[];
  exportDialogOpen?: boolean;
  onExportDialogChange?: (open: boolean) => void;
}

interface TaskGroup {
  date: string;
  tasks: Task[];
}

const CompletedTasksView: React.FC<CompletedTasksViewProps> = ({
  tasks,
  exportDialogOpen: externalExportDialogOpen,
  onExportDialogChange
}) => {
  const { projects } = useProjectContext();
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [internalExportDialogOpen, setInternalExportDialogOpen] = useState(false);

  // Use either the external or internal state for the dialog
  const exportDialogOpen = externalExportDialogOpen !== undefined ? externalExportDialogOpen : internalExportDialogOpen;

  // Handle dialog state changes
  const handleExportDialogChange = (open: boolean) => {
    if (onExportDialogChange) {
      onExportDialogChange(open);
    } else {
      setInternalExportDialogOpen(open);
    }
  };

  // Load saved date range from localStorage on component mount
  useEffect(() => {
    const savedFilters = localStorage.getItem(COMPLETED_TASKS_FILTERS_KEY);
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
        // 首先确保任务有完成日期
        const completedDate = task.completed_at ? new Date(task.completed_at) : null;

        // 日期范围筛选
        const matchesDateRange =
          (!dateRange?.from || (completedDate && completedDate >= dateRange.from)) &&
          (!dateRange?.to || (completedDate && completedDate <= dateRange.to));

        // 项目筛选
        const matchesProjects =
          selectedProjects.length === 0 || selectedProjects.includes(task.project || "");

        return matchesDateRange && matchesProjects;
      })
      .reduce((groups: TaskGroup[], task) => {
        // 确保使用完成日期而不是任务日期进行分组
        if (!task.completed_at) return groups; // 跳过没有完成日期的任务

        const date = format(new Date(task.completed_at), "yyyy-MM-dd");
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
    const savedFilters = localStorage.getItem(COMPLETED_TASKS_FILTERS_KEY) || '{}';
    try {
      const parsedFilters = JSON.parse(savedFilters);
      const filtersToSave = {
        ...parsedFilters,
        dateRange: dateRange ? {
          from: dateRange.from?.toISOString(),
          to: dateRange.to?.toISOString()
        } : undefined
      };
      localStorage.setItem(COMPLETED_TASKS_FILTERS_KEY, JSON.stringify(filtersToSave));
    } catch (error) {
      console.error("Error saving date range to localStorage:", error);
    }
  };

  // Generate markdown for tasks based on current filters
  const generateMarkdown = React.useCallback(() => {
    // Use the filtered and grouped tasks that are already displayed
    const filteredTasks = filteredAndGroupedTasks.flatMap(group => group.tasks);

    // Generate markdown
    let title = "已完成任务";

    // Add date range to title if present
    if (dateRange?.from) {
      title += ` (${format(dateRange.from, 'yyyy-MM-dd')}`;
      if (dateRange.to && dateRange.to.getTime() !== dateRange.from.getTime()) {
        title += ` 至 ${format(dateRange.to, 'yyyy-MM-dd')}`;
      }
      title += ")";
    }

    // Add project filter info to title if present
    if (selectedProjects.length > 0) {
      const projectNames = selectedProjects
        .map(id => projects.find(p => p.id === id)?.name || '')
        .filter(name => name)
        .join(', ');

      if (projectNames) {
        title += ` - ${projectNames}`;
      }
    }

    let markdown = `# ${title}\n\n`;

    if (filteredTasks.length === 0) {
      markdown += '没有符合条件的已完成任务。';
    } else {
      // Group tasks by date
      const tasksByDate: Record<string, Task[]> = {};

      filteredTasks.forEach(task => {
        if (task.completed_at) {
          const dateStr = format(new Date(task.completed_at), 'yyyy-MM-dd');
          if (!tasksByDate[dateStr]) {
            tasksByDate[dateStr] = [];
          }
          tasksByDate[dateStr].push(task);
        }
      });

      // Sort dates (newest first)
      const sortedDates = Object.keys(tasksByDate).sort((a, b) => b.localeCompare(a));

      // Generate markdown for each date group
      sortedDates.forEach(dateStr => {
        const tasksForDate = tasksByDate[dateStr];
        const formattedDate = format(new Date(dateStr), 'yyyy年MM月dd日', { locale: zhCN });

        markdown += `## ${formattedDate} (${tasksForDate.length}项)\n\n`;

        // Sort tasks within each date (newest first)
        tasksForDate.sort((a, b) => {
          const timeA = a.completed_at ? new Date(a.completed_at).getTime() : 0;
          const timeB = b.completed_at ? new Date(b.completed_at).getTime() : 0;
          return timeB - timeA;
        });

        tasksForDate.forEach(task => {
          const completedDate = task.completed_at ? format(new Date(task.completed_at), 'yyyy-MM-dd HH:mm') : '未知时间';
          const projectName = projects.find(p => p.id === task.project)?.name || '无清单';

          markdown += `### ${task.title}\n\n`;
          markdown += `- **完成时间**: ${completedDate}\n`;
          markdown += `- **清单**: ${projectName}\n`;

          if (task.description) {
            let description = task.description;
            try {
              // Try to parse as JSON format (both EditorJS and BlockNote)
              const parsed = JSON.parse(task.description);
              if (parsed.blocks) {
                // EditorJS format
                description = parsed.blocks.map((block: { type: string; data: { text: string } }) => {
                  if (block.type === 'paragraph') {
                    return block.data.text;
                  }
                  return '';
                }).join('\n');
              } else if (Array.isArray(parsed)) {
                // BlockNote format
                description = parsed.map((block: { type: string; content?: { type: string; text: string }[] }) => {
                  if (block.content && Array.isArray(block.content)) {
                    return block.content.map((content: { type: string; text: string }) => 
                      content.type === 'text' ? content.text : ''
                    ).join('');
                  }
                  return '';
                }).join('\n');
              }
            } catch (e) {
              // If not JSON, use as is (might be plain text)
            }

            markdown += `- **描述**:\n\n${description}\n\n`;
          }

          markdown += `\n`;
        });

        markdown += `---\n\n`;
      });
    }

    return markdown;
  }, [filteredAndGroupedTasks, projects, dateRange, selectedProjects]);

  // Memoize the markdown content
  const markdownContent = useMemo(() => generateMarkdown(), [generateMarkdown]);

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
            storageKey={COMPLETED_TASKS_FILTERS_KEY + ".projects"}
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
                <p>未找到匹配条件的已完成任务</p>
                <Button variant="outline" size="sm" onClick={resetAllFilters} className="mt-2">清除筛选条件</Button>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Markdown 导出对话框 */}
      <Dialog open={exportDialogOpen} onOpenChange={handleExportDialogChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>导出已完成任务</DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            <Textarea
              value={markdownContent.replace(/\\n/g, '\n')}
              readOnly
              className="font-mono text-sm h-[400px] whitespace-pre-wrap"
              onClick={(e) => (e.target as HTMLTextAreaElement).select()}
            />
          </div>
          <DialogFooter className="mt-4">
            <Button
              onClick={() => {
                navigator.clipboard.writeText(markdownContent.replace(/\\n/g, '\n'));
                handleExportDialogChange(false);
              }}
            >
              <Icon icon="copy" size="16" className="mr-2 h-4 w-4" />
              复制并关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CompletedTasksView;
