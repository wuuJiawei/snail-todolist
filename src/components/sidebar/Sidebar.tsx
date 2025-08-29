import React, { useState, useMemo } from "react";
import { useTaskContext } from "@/contexts/task";
import { useProjectContext } from "@/contexts/ProjectContext";
import ProjectItem from "@/components/sidebar/ProjectItem";
import { Button } from "@/components/ui/button";
import { Plus, Share2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import EditProjectDialog from "@/components/projects/EditProjectDialog";
import JoinSharedProjectDialog from "@/components/projects/JoinSharedProjectDialog";
import { useSidebar } from "@/contexts/SidebarContext";
import { DragDropContext, Droppable, DropResult } from "@hello-pangea/dnd";
import { Project } from "@/types/project";
import CheckInButton from "@/components/sidebar/CheckInButton";
import { useToast } from "@/components/ui/use-toast";
import { isToday, isBefore, startOfDay, addDays, parseISO, isValid, isWithinInterval } from 'date-fns';
import { Skeleton } from "@/components/ui/skeleton";

const Sidebar: React.FC = () => {
  const { tasks, selectProject, selectedProject, getTrashCount } = useTaskContext();
  const { projects: dbProjects, loading, createProject, reorderProjects, refreshProjects } = useProjectContext();
  const { collapsed } = useSidebar();
  const [newProjectDialogOpen, setNewProjectDialogOpen] = useState(false);
  const [joinSharedDialogOpen, setJoinSharedDialogOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  // Calculate counts for Today and Recent 7 days
  const { todayCount, recentCount } = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const sevenDaysLater = addDays(todayStart, 7);

    let today = 0;
    let recent = 0;

    tasks.forEach(task => {
      if (!task.completed) {
        let taskDate: Date | null = null;
        if (task.date) {
          try {
            const parsed = parseISO(task.date);
            if (isValid(parsed)) {
              taskDate = startOfDay(parsed); // Normalize to start of day
            }
          } catch (e) {
            console.error("Invalid date format for task:", task.id, task.date);
          }
        }

        // Count for Today: Overdue or Due Today
        if (taskDate && (isToday(taskDate) || isBefore(taskDate, todayStart))) {
          today++;
        }

        // Count for Recent 7 Days: Overdue or Due within the next 7 days (inclusive of today)
        if (taskDate && (isBefore(taskDate, todayStart) || isWithinInterval(taskDate, { start: todayStart, end: sevenDaysLater }))) {
          recent++;
        }
      }
    });

    return { todayCount: today, recentCount: recent };
  }, [tasks]);

  const fixedProjects: Project[] = [
    { id: "recent", name: "最近7天", icon: "calendar", count: recentCount, isFixed: true },
    { id: "today", name: "今天", icon: "calendar-days", count: todayCount, isFixed: true },
    { id: "completed", name: "已完成", icon: "check-square", count: 0, isFixed: true }, // Completed count might be handled differently or not shown
    { id: "abandoned", name: "已放弃", icon: "close-one", count: 0, isFixed: true }, // Abandoned count might be handled differently or not shown
    { id: "trash", name: "垃圾桶", icon: "recycling-pool", count: 0, isFixed: true }, // Removed count for trash
  ];

  const customDbProjects = dbProjects.map(p => ({ ...p, isFixed: false }));

  const customProjects = customDbProjects;

  const handleNewProject = () => {
    setNewProjectDialogOpen(true);
  };

  const handleJoinShared = () => {
    setJoinSharedDialogOpen(true);
  };

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await refreshProjects();
      toast({
        title: "刷新成功",
        description: "清单列表已更新",
      });
    } catch (error) {
      console.error('Error refreshing projects:', error);
      toast({
        title: "刷新失败",
        description: "无法刷新清单列表，请稍后再试",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Check-in is now handled in the CheckInButton component

  const handleDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) {
      return;
    }

    reorderProjects(draggableId, destination.index);
  };

  return (
    <div
      className={cn(
        "h-screen overflow-y-auto custom-scrollbar flex flex-col transition-all duration-300 dark:bg-gray-900",
        collapsed ? "w-0 opacity-0 p-0" : "w-full p-2"
      )}
    >
      <div className="px-2 py-1 space-y-1 mb-3">
        {fixedProjects.map((project) => (
          <ProjectItem
            key={project.id}
            project={project}
            isDraggable={false}
          />
        ))}
      </div>

      {!collapsed && (
        <div className="mt-2 flex-grow flex flex-col">
          <div className="px-3 py-2 flex items-center justify-between mb-2 border-t border-gray-200 dark:border-gray-600 pt-3">
            <span className="text-xs uppercase font-medium text-gray-500 dark:text-gray-400">清单</span>
            <div className="flex space-x-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-6 w-6 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                title="刷新清单"
              >
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleJoinShared}
                className="h-6 w-6 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                title="加入共享清单"
              >
                <Share2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNewProject}
                className="h-6 w-6 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                title="新建清单"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="custom-projects">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={cn(
                    "space-y-1 px-2 pb-2 pt-1 flex-grow overflow-y-auto custom-scrollbar-thin",
                    snapshot.isDraggingOver && "bg-gray-100 dark:bg-gray-800 rounded-md"
                  )}
                >
                  {loading ? (
                    <div className="space-y-2 px-2">
                      {Array(5).fill(0).map((_, index) => (
                        <div key={index} className="flex items-center gap-2 p-2">
                          <Skeleton className="h-5 w-5 rounded-full" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                      ))}
                    </div>
                  ) : customProjects.length === 0 ? (
                    <div className="p-3 text-sm text-gray-500 dark:text-gray-400 text-center">暂无清单</div>
                  ) : (
                    customProjects.map((project, index) => (
                      <ProjectItem
                        key={project.id}
                        project={project}
                        index={index}
                        isDraggable={true}
                      />
                    ))
                  )}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          <EditProjectDialog
            open={newProjectDialogOpen}
            onOpenChange={setNewProjectDialogOpen}
            project={null}
            onSave={createProject}
          />

          <JoinSharedProjectDialog
            open={joinSharedDialogOpen}
            onOpenChange={setJoinSharedDialogOpen}
          />

          {/* 打卡按钮 */}
          <CheckInButton />
        </div>
      )}
    </div>
  );
};

export default Sidebar;
