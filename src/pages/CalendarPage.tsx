import { useEffect, useMemo, useRef, useState } from "react";
import FullCalendar, {
  type CalendarRef,
  type DateClickInfo,
  type DatesSetInfo,
  type EventClickInfo,
  type EventDisplayInfo,
  type EventDropInfo,
  type EventInput,
  type EventResizeDoneInfo,
} from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/react/daygrid";
import interactionPlugin from "@fullcalendar/react/interaction";
import zhCnLocale from "@fullcalendar/react/locales/zh-cn";
import multiMonthPlugin from "@fullcalendar/react/multimonth";
import classicThemePlugin from "@fullcalendar/react/themes/classic";
import "@fullcalendar/react/skeleton.css";
import "@fullcalendar/react/themes/classic/theme.css";
import { addMilliseconds, format } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, Filter, Plus } from "lucide-react";

import CalendarTaskDialog from "@/components/calendar/CalendarTaskDialog";
import TaskDetail from "@/components/tasks/TaskDetail";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useProjectContext } from "@/contexts/ProjectContext";
import { useTaskContext } from "@/contexts/task";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Task } from "@/types/task";
import {
  isTaskDateExpired,
  serializeTaskDateValue,
  toTaskDateValue,
  type TaskDateValue,
} from "@/utils/taskDate";

type CalendarView = "year" | "month" | "week";

const VIEW_STORAGE_KEY = "snail-calendar-view";
const VIEW_NAMES: Record<CalendarView, string> = {
  year: "年",
  month: "月",
  week: "周",
};
const FULLCALENDAR_VIEWS: Record<CalendarView, string> = {
  year: "multiMonthYear",
  month: "dayGridMonth",
  week: "dayGridWeek",
};

const getInitialView = (): CalendarView => {
  const stored = window.localStorage.getItem(VIEW_STORAGE_KEY);
  return stored && stored in FULLCALENDAR_VIEWS ? stored as CalendarView : "month";
};

const CalendarPage = () => {
  const calendarRef = useRef<CalendarRef>(null);
  const { tasks, loading, selectedTask, selectTask, updateTask } = useTaskContext();
  const { projects } = useProjectContext();
  const { toast } = useToast();
  const [view, setView] = useState<CalendarView>(getInitialView);
  const [rangeTitle, setRangeTitle] = useState("");
  const [hiddenProjectIds, setHiddenProjectIds] = useState<Set<string>>(new Set());
  const [showCompleted, setShowCompleted] = useState(true);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createDate, setCreateDate] = useState<TaskDateValue>({ type: "date", start: new Date() });

  useEffect(() => {
    if (!selectedTask) setDetailOpen(false);
  }, [selectedTask]);

  const visibleTasks = useMemo(() => tasks.filter((task) => (
    task.date
    && !task.deleted
    && !task.abandoned
    && (showCompleted || !task.completed)
    && (!task.project || !hiddenProjectIds.has(task.project))
  )), [hiddenProjectIds, showCompleted, tasks]);

  const taskById = useMemo(
    () => new Map(visibleTasks.map((task) => [task.id, task])),
    [visibleTasks],
  );

  const events = useMemo<EventInput[]>(() => visibleTasks.flatMap((task) => {
    const value = toTaskDateValue(task);
    if (!value) return [];
    const allDay = value.type === "date";

    return [{
      id: task.id,
      title: task.title,
      start: allDay ? format(value.start, "yyyy-MM-dd") : value.start,
      end: value.type === "range" ? value.end : undefined,
      allDay,
      editable: true,
      durationEditable: value.type === "range",
      extendedProps: { taskId: task.id },
    }];
  }), [visibleTasks]);

  const changeView = (nextView: CalendarView, date?: Date) => {
    const api = calendarRef.current?.getApi();
    setView(nextView);
    window.localStorage.setItem(VIEW_STORAGE_KEY, nextView);
    if (api) {
      api.changeView(FULLCALENDAR_VIEWS[nextView], date);
    }
  };

  const openCreateDialog = (value: TaskDateValue) => {
    setCreateDate(value);
    setCreateOpen(true);
  };

  const handleDateClick = (info: DateClickInfo) => {
    if (info.view.type === FULLCALENDAR_VIEWS.year) {
      changeView("week", info.date);
      return;
    }
    openCreateDialog({ type: info.allDay ? "date" : "datetime", start: info.date });
  };

  const handleEventClick = (info: EventClickInfo) => {
    const target = info.jsEvent.target;
    if (!(target instanceof Element) || target.closest("[data-calendar-task-checkbox]")) return;
    if (!target.closest("[data-calendar-task-title]")) return;
    selectTask(info.event.id);
    setDetailOpen(true);
  };

  const saveMovedEvent = async (info: EventDropInfo | EventResizeDoneInfo) => {
    const task = taskById.get(info.event.id);
    const start = info.event.start;
    const previous = task ? toTaskDateValue(task) : undefined;
    if (!task || !start || !previous) {
      info.revert();
      return;
    }

    let nextValue: TaskDateValue;
    if (previous.type === "date") {
      nextValue = { type: "date", start };
    } else if (previous.type === "datetime") {
      nextValue = { type: "datetime", start };
    } else {
      const previousDuration = previous.end.getTime() - previous.start.getTime();
      nextValue = {
        type: "range",
        start,
        end: info.event.end ?? addMilliseconds(start, previousDuration),
      };
    }

    try {
      await updateTask(task.id, serializeTaskDateValue(nextValue));
    } catch (error) {
      info.revert();
      toast({ title: "调整失败", description: "无法保存任务时间，请稍后重试。", variant: "destructive" });
    }
  };

  const renderEvent = (info: EventDisplayInfo) => {
    const task = taskById.get(info.event.id);
    if (!task) return null;
    if (view === "year") {
      return (
        <span
          className="task-calendar__year-event-title"
          data-calendar-task-title
          title={task.title}
        >
          {task.title}
        </span>
      );
    }

    const handleCompletedChange = async (checked: boolean) => {
      await updateTask(task.id, {
        completed: checked,
        completed_at: checked ? new Date().toISOString() : undefined,
      });
    };

    return (
      <div className="task-calendar__event-content" title={task.title}>
        <span
          data-calendar-task-checkbox
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          onPointerUp={(event) => event.stopPropagation()}
        >
          <Checkbox
            checked={task.completed}
            onCheckedChange={(checked) => void handleCompletedChange(checked === true)}
            aria-label={task.completed ? "标记为未完成" : "标记为已完成"}
            className="task-calendar__event-checkbox"
          />
        </span>
        <span className="task-calendar__event-copy">
          {info.timeText && <span className="task-calendar__event-time">{info.timeText}</span>}
          <span className="task-calendar__event-title" data-calendar-task-title>{task.title}</span>
        </span>
      </div>
    );
  };

  const calendar = (
    <div className={cn("task-calendar h-full min-w-0", `task-calendar--${view}`)}>
      {loading ? (
        <div className="grid h-full grid-cols-7 gap-px bg-border p-px">
          {Array.from({ length: 35 }).map((_, index) => (
            <Skeleton key={index} className="min-h-24 rounded-none bg-background" />
          ))}
        </div>
      ) : (
        <FullCalendar
          ref={calendarRef}
          plugins={[interactionPlugin, dayGridPlugin, multiMonthPlugin, classicThemePlugin]}
          themeSystem="classic"
          locale={zhCnLocale}
          initialView={FULLCALENDAR_VIEWS[view]}
          headerToolbar={false}
          height="100%"
          firstDay={1}
          nowIndicator
          navLinks={false}
          editable
          eventResizableFromStart
          dayMaxEvents={view === "week" ? false : 3}
          moreLinkClick="popover"
          moreLinkContent={(info) => `查看更多（${info.num}）`}
          popoverClass="task-calendar__popover"
          displayEventTime={view === "month"}
          defaultTimedEventDuration="00:30:00"
          events={events}
          datesSet={(info: DatesSetInfo) => setRangeTitle(info.view.title)}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          eventDrop={(info: EventDropInfo) => void saveMovedEvent(info)}
          eventResize={(info: EventResizeDoneInfo) => void saveMovedEvent(info)}
          eventContent={renderEvent}
          eventClass={(info) => {
            const task = taskById.get(info.event.id);
            return [
              "task-calendar__event",
              task?.completed ? "task-calendar__event--completed" : "",
              task && isTaskDateExpired(task) ? "task-calendar__event--overdue" : "",
            ].filter(Boolean);
          }}
          dayHeaderClass={() => ["task-calendar__day-header"]}
          dayHeaderContent={(info) => <span>{info.text}</span>}
          dayCellClass={(info) => [
            "task-calendar__day",
            info.isToday ? "task-calendar__day--today" : "",
          ].filter(Boolean)}
          dayCellTopContent={(info) => (
            <span className="task-calendar__day-number">{info.dayNumberText}</span>
          )}
          moreLinkClass={() => ["task-calendar__more-link"]}
          singleMonthClass={() => ["task-calendar__month-card"]}
          singleMonthHeaderClass={() => ["task-calendar__month-header"]}
        />
      )}
    </div>
  );

  return (
    <div className="flex h-full min-w-0 flex-col bg-background">
      <header className="flex min-h-16 flex-wrap items-center gap-2 border-b px-4 py-3 lg:px-6">
        <div className="mr-auto flex min-w-0 items-center gap-3">
          <CalendarDays className="h-5 w-5 text-muted-foreground" />
          <h1 className="truncate text-lg font-semibold">{rangeTitle || "日历"}</h1>
        </div>

        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={() => openCreateDialog({ type: "date", start: new Date() })}
          aria-label="新建任务"
        >
          <Plus className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-2">
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">筛选</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>显示范围</DropdownMenuLabel>
            <DropdownMenuCheckboxItem checked={showCompleted} onCheckedChange={(checked) => setShowCompleted(checked === true)}>
              已完成任务
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>清单</DropdownMenuLabel>
            {projects.map((project) => (
              <DropdownMenuCheckboxItem
                key={project.id}
                checked={!hiddenProjectIds.has(project.id)}
                onSelect={(event) => event.preventDefault()}
                onCheckedChange={(checked) => setHiddenProjectIds((current) => {
                  const next = new Set(current);
                  if (checked) next.delete(project.id);
                  else next.add(project.id);
                  return next;
                })}
              >
                {project.name}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={view}
          onValueChange={(value) => value && changeView(value as CalendarView)}
          aria-label="日历视图"
          className="order-last h-9 w-full sm:order-none sm:w-auto"
        >
          {(Object.keys(VIEW_NAMES) as CalendarView[]).map((key) => (
            <ToggleGroupItem key={key} value={key} className="h-9 flex-1 px-3 sm:flex-none">
              {VIEW_NAMES[key]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <div className="flex h-9 items-center">
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-r-none" onClick={() => calendarRef.current?.getApi().prev()} aria-label="上一时间段">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="-ml-px h-9 rounded-none px-4" onClick={() => calendarRef.current?.getApi().today()}>
            今天
          </Button>
          <Button variant="outline" size="icon" className="-ml-px h-9 w-9 rounded-l-none" onClick={() => calendarRef.current?.getApi().next()} aria-label="下一时间段">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="min-h-0 flex-1">{calendar}</main>

      <Sheet open={detailOpen} onOpenChange={(open) => {
        setDetailOpen(open);
        if (!open) selectTask(null);
      }}>
        <SheetContent
          side="right"
          className="w-full max-w-none p-0 sm:w-[min(42rem,90vw)] sm:max-w-[min(42rem,90vw)] [&>button]:hidden"
        >
          <SheetHeader className="sr-only"><SheetTitle>任务详情</SheetTitle></SheetHeader>
          <TaskDetail />
        </SheetContent>
      </Sheet>

      <CalendarTaskDialog open={createOpen} initialDate={createDate} onOpenChange={setCreateOpen} />
    </div>
  );
};

export default CalendarPage;
