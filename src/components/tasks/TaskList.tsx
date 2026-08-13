import React, { useEffect, useMemo, useState } from "react";
import { SearchX } from "lucide-react";
import { useTaskContext } from "@/contexts/task";
import { useProjectContext } from "@/contexts/ProjectContext";
import { Task } from "@/types/task";
import TaskItem from "@/components/tasks/TaskItem";
import { DragDropContext, Droppable, DropResult } from "@hello-pangea/dnd";
import { useTasksFilter } from "@/hooks/useTasksFilter";
import { useTaskFilter } from "@/hooks/useTaskFilter";
import { cn } from "@/lib/utils";
import { TODAY_TASKS_FILTERS_KEY, RECENT_TASKS_FILTERS_KEY, FLAGGED_TASKS_FILTERS_KEY } from "@/constants/storage-keys";
import TaskFilter, { TaskFilterOptions } from "@/components/tasks/TaskFilter";
import TaskListSkeleton from "@/components/tasks/TaskListSkeleton";
import { Button } from "@/components/ui/button";
import { filterTasksBySearch } from "@/utils/taskSearch";

import TaskHeader from "./TaskHeader";
import TaskSearch from "./TaskSearch";
import AddTaskForm from "./AddTaskForm";
import TasksExpired from "./TasksExpired";
import TasksByDate from "./TasksByDate";
import TasksCompleted from "./TasksCompleted";
import CompletedTasksCollapsible from "./CompletedTasksCollapsible";
import AbandonedTasksCollapsible from "./AbandonedTasksCollapsible";
import EmptyStateGuide from "./EmptyStateGuide";
import EditProjectDialog from "@/components/projects/EditProjectDialog";
import RecentTasksTimeline from "./RecentTasksTimeline";

const RECENT_HERO_URL = "/images/recent-hero.webp";
const TODAY_HERO_URL = "/images/today-hero.webp";
const FLAGGED_HERO_URL = "/images/flagged-hero.webp";

const createEmptyFilters = (): TaskFilterOptions => ({
  status: [],
  deadline: [],
  hasAttachments: null,
  tags: [],
});

const TaskList: React.FC = () => {
  const {
    tasks,
    abandonedTasks,
    abandonedLoaded,
    loading,
    selectedProject,
    addTask,
    reorderTasks,
  } = useTaskContext();
  const { projects, createProject } = useProjectContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filteredProjects, setFilteredProjects] = useState<string[]>([]);
  const [newProjectDialogOpen, setNewProjectDialogOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [taskFilters, setTaskFilters] = useState<TaskFilterOptions>(createEmptyFilters);

  const getStorageKey = () => {
    if (selectedProject === "today") return TODAY_TASKS_FILTERS_KEY;
    if (selectedProject === "recent") return RECENT_TASKS_FILTERS_KEY;
    if (selectedProject === "flagged") return FLAGGED_TASKS_FILTERS_KEY;
    return null;
  };

  useEffect(() => {
    setFilteredProjects([]);
    setSearchQuery("");
    setSearchOpen(false);
  }, [selectedProject]);

  const {
    expiredTasks,
    pendingTasksByDate,
    completedTasks,
    pendingTasks,
    isSpecialView
  } = useTasksFilter(tasks, selectedProject, filteredProjects);

  const { filteredTasks: rawFilteredPendingTasks, activeFilterCount } = useTaskFilter(pendingTasks || [], taskFilters);
  const { filteredTasks: rawFilteredCompletedTasks } = useTaskFilter(completedTasks || [], taskFilters);
  const { filteredTasks: rawFilteredExpiredTasks } = useTaskFilter(expiredTasks || [], taskFilters);
  const { filteredTasks: rawFilteredPendingTasksByDate } = useTaskFilter(pendingTasksByDate || {}, taskFilters);
  const totalActiveFilterCount = activeFilterCount + (filteredProjects.length > 0 ? 1 : 0);

  const searchActive = searchQuery.trim().length > 0;
  const filteredPendingTasks = filterTasksBySearch(rawFilteredPendingTasks as Task[], searchQuery);
  const filteredCompletedTasks = filterTasksBySearch(rawFilteredCompletedTasks as Task[], searchQuery);
  const filteredExpiredTasks = filterTasksBySearch(rawFilteredExpiredTasks as Task[], searchQuery);
  const filteredTimelineTasks = useMemo(
    () => [...filteredPendingTasks, ...filteredCompletedTasks],
    [filteredCompletedTasks, filteredPendingTasks],
  );
  const defaultTaskDate = useMemo(
    () => selectedProject === "today" ? new Date() : undefined,
    [selectedProject],
  );

  const filteredPendingTasksByDate = useMemo(() => {
    const groupedTasks = rawFilteredPendingTasksByDate as { [key: string]: Task[] };
    if (!searchActive) return groupedTasks;

    return Object.entries(groupedTasks).reduce<{ [key: string]: Task[] }>((result, [dateKey, dateTasks]) => {
      const matchingTasks = filterTasksBySearch(dateTasks, searchQuery);
      if (matchingTasks.length > 0) {
        result[dateKey] = matchingTasks;
      }
      return result;
    }, {});
  }, [rawFilteredPendingTasksByDate, searchActive, searchQuery]);

  const matchingCompletedCount = useMemo(() => {
    if (isSpecialView) return 0;
    return filterTasksBySearch(
      (completedTasks || []).filter(task => !task.deleted && !task.abandoned),
      searchQuery,
    ).length;
  }, [completedTasks, isSpecialView, searchQuery]);

  const matchingAbandonedCount = useMemo(() => {
    if (isSpecialView) return 0;
    const projectAbandonedTasks = abandonedTasks.filter(task =>
      task.project === selectedProject && task.abandoned && !task.deleted
    );
    return filterTasksBySearch(projectAbandonedTasks, searchQuery).length;
  }, [abandonedTasks, isSpecialView, searchQuery, selectedProject]);

  const searchResultCount = filteredPendingTasks.length + matchingCompletedCount + matchingAbandonedCount;
  const showSearchEmpty = !isSpecialView && searchActive && abandonedLoaded && searchResultCount === 0;

  const clearSearch = () => {
    setSearchQuery("");
    setSearchOpen(false);
  };

  const clearTaskFilters = () => {
    setTaskFilters(createEmptyFilters());
    setFilteredProjects([]);

    const storageKey = getStorageKey();
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify([]));
    }
  };

  const projectDetails = (() => {
    if (selectedProject === "recent") {
      return {
        name: "最近7天",
        icon: "calendar",
        color: "#2196F3"
      };
    }
    if (selectedProject === "today") {
      return {
        name: "今天",
        icon: "calendar-days",
        color: "#4CAF50"
      };
    }
    if (selectedProject === "flagged") {
      return {
        name: "标记",
        icon: "flag",
        color: "#F97316"
      };
    }

    const project = projects.find(project => project.id === selectedProject);
    if (project) {
      return {
        name: project.name,
        icon: project.icon,
        color: project.color
      };
    }

    return {
      name: selectedProject,
      icon: "folder",
      color: "#000000"
    };
  })();

  const getProjectName = (projectId: string | undefined) => {
    if (!projectId) return "";

    const project = projects.find(p => p.id === projectId);
    if (project) return project.name;

    return projectId;
  };

  const handleAddTask = async (title: string, date?: Date, projectId?: string) => {
    setIsSubmitting(true);

    try {
      const dateString = date ? date.toISOString() : undefined;
      const targetProject = projectId || selectedProject;

      await addTask({
        title: title,
        completed: false,
        project: targetProject,
        date: dateString,
      });
    } catch (error) {
      console.error("Failed to add task:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const allowSorting = !isSpecialView && selectedProject !== "completed" && selectedProject !== "today" && selectedProject !== "recent";

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    if (result.destination.droppableId === result.source.droppableId && allowSorting) {
      const isCompletedArea = result.source.droppableId === "completed-tasks";
      reorderTasks(selectedProject, sourceIndex, destinationIndex, isCompletedArea);
    }
  };

  const renderTask = (task: Task, index?: number, isDraggable = false) => (
    <TaskItem
      key={task.id}
      task={task}
      showProject={isSpecialView && selectedProject !== "today" && selectedProject !== "flagged"}
      projectName={isSpecialView && selectedProject !== "today" && selectedProject !== "flagged" ? getProjectName(task.project) : undefined}
      index={index}
      isDraggable={isDraggable}
      showViewDetailsAction={selectedProject === "today" || selectedProject === "recent" || selectedProject === "flagged"}
    />
  );

  if (loading) {
    return <TaskListSkeleton />;
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-screen">
      <TaskHeader
        projectName={projectDetails.name}
        icon={projectDetails.icon}
        iconColor={projectDetails.color}
        heroImage={
          selectedProject === "today"
            ? TODAY_HERO_URL
            : selectedProject === "flagged"
              ? FLAGGED_HERO_URL
              : selectedProject === "recent"
                ? RECENT_HERO_URL
                : undefined
        }
        compactHero={selectedProject === "today" || selectedProject === "recent" || selectedProject === "flagged"}
        heroImagePosition="object-center"
        actions={
          <div className="flex items-center gap-1">
            {!isSpecialView && (
              <TaskSearch
                value={searchQuery}
                open={searchOpen}
                onChange={setSearchQuery}
                onOpenChange={setSearchOpen}
                onClear={clearSearch}
              />
            )}
            <TaskFilter
              filters={taskFilters}
              onFiltersChange={setTaskFilters}
              activeCount={activeFilterCount}
              projectFilter={(selectedProject === "today" || selectedProject === "recent" || selectedProject === "flagged") ? {
                projects,
                selectedProjects: filteredProjects,
                onChange: setFilteredProjects,
                storageKey: getStorageKey(),
              } : undefined}
            />
          </div>
        }
      />

      {(!isSpecialView || selectedProject === "today") && (
        <AddTaskForm
          key={selectedProject}
          onAddTask={handleAddTask}
          isSubmitting={isSubmitting}
          defaultDate={defaultTaskDate}
          projectSelection={selectedProject === "today" ? {
            projects,
            required: true,
          } : undefined}
        />
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex-1 overflow-y-auto custom-scrollbar pb-4">
            {showSearchEmpty ? (
              <div className="flex min-h-[280px] items-center justify-center px-6 py-10 text-center">
                <div className="flex max-w-sm flex-col items-center">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <SearchX className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-medium text-foreground">没有搜索结果</h3>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    当前清单中没有匹配“{searchQuery.trim()}”的进行中、已完成或已放弃任务
                  </p>
                  <div className="mt-4 flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={clearSearch}>
                      清空搜索
                    </Button>
                    {totalActiveFilterCount > 0 && (
                      <Button variant="ghost" size="sm" onClick={clearTaskFilters}>
                        清空筛选
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ) : selectedProject === "today" || selectedProject === "recent" || selectedProject === "flagged" ? (
              filteredPendingTasks.length === 0 &&
              filteredCompletedTasks.length === 0 &&
              totalActiveFilterCount === 0 ? (
                <EmptyStateGuide
                  viewType={selectedProject}
                  onCreateProject={() => setNewProjectDialogOpen(true)}
                  hasProjects={projects.length > 0}
                />
              ) : (
                <RecentTasksTimeline
                  tasks={filteredTimelineTasks}
                  renderTask={renderTask}
                  emptyMessage={totalActiveFilterCount > 0 ? "没有符合筛选条件的任务" : undefined}
                  showDateStrip={selectedProject === "recent"}
                  grouping={selectedProject === "recent" ? "date" : "project"}
                  projects={selectedProject === "recent" ? undefined : projects}
                />
              )
            ) : isSpecialView ? (
              <>
                {filteredExpiredTasks.length === 0 &&
                 Object.keys(filteredPendingTasksByDate).length === 0 &&
                 filteredCompletedTasks.length === 0 &&
                 totalActiveFilterCount === 0 ? (
                  <EmptyStateGuide
                    viewType={selectedProject as "today" | "recent" | "flagged"}
                    onCreateProject={() => setNewProjectDialogOpen(true)}
                    hasProjects={projects.length > 0}
                  />
                ) : (
                  <>
                    <TasksExpired
                      tasks={filteredExpiredTasks}
                      renderTask={renderTask}
                    />

                    <TasksByDate
                      tasksByDate={filteredPendingTasksByDate}
                      renderTask={renderTask}
                      showEmptyMessage={filteredExpiredTasks.length === 0 && totalActiveFilterCount > 0}
                    />

                    {filteredCompletedTasks.length > 0 && (
                      <div className="mt-4">
                        <TasksCompleted
                          tasks={filteredCompletedTasks}
                          renderTask={renderTask}
                          allowSorting={allowSorting}
                        />
                      </div>
                    )}
                  </>
                )}
              </>
            ) : (
              <>
                {filteredPendingTasks.length > 0 ? (
                  <Droppable droppableId="pending-tasks" isDropDisabled={!allowSorting}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          "pb-2",
                          snapshot.isDraggingOver && allowSorting && "bg-gray-50 rounded-md"
                        )}
                      >
                        {filteredPendingTasks.map((task, index) => (
                          <div className="px-4" key={task.id}>
                            {renderTask(task, index, allowSorting)}
                          </div>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                ) : (
                  <div className="text-center p-4 text-gray-500">
                    {searchActive
                      ? "没有匹配的进行中任务"
                      : activeFilterCount > 0
                        ? "没有符合筛选条件的任务"
                        : "暂无待办任务"}
                  </div>
                )}
              </>
            )}
          </div>
        </DragDropContext>

        {!isSpecialView && !showSearchEmpty && (
          <div className="flex-shrink-0">
            <CompletedTasksCollapsible
              projectId={selectedProject}
              showProject={isSpecialView}
              searchQuery={searchQuery}
            />
            <AbandonedTasksCollapsible
              projectId={selectedProject}
              showProject={isSpecialView}
              searchQuery={searchQuery}
            />
          </div>
        )}
      </div>

      <EditProjectDialog
        open={newProjectDialogOpen}
        onOpenChange={setNewProjectDialogOpen}
        project={null}
        onSave={createProject}
      />
    </div>
  );
};

export default TaskList;
