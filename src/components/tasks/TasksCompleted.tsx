import React, { useState, useMemo } from "react";
import { Task } from "@/types/task";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Droppable } from "@hello-pangea/dnd";

interface TasksCompletedProps {
  tasks: Task[];
  renderTask: (task: Task, index?: number, isDraggable?: boolean) => React.ReactNode;
  allowSorting?: boolean;
}

const ITEMS_PER_PAGE = 10; // 每页显示的任务数量

const TasksCompleted: React.FC<TasksCompletedProps> = ({ tasks, renderTask, allowSorting = false }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // 计算分页数据
  const paginatedData = useMemo(() => {
    const totalPages = Math.ceil(tasks.length / ITEMS_PER_PAGE);
    const displayedTasks = tasks.slice(0, currentPage * ITEMS_PER_PAGE);
    const hasMore = currentPage < totalPages;
    
    return {
      displayedTasks,
      hasMore,
      totalPages,
      currentPage
    };
  }, [tasks, currentPage]);

  const handleLoadMore = async () => {
    if (paginatedData.hasMore && !isLoading) {
      setIsLoading(true);
      
      // 模拟异步加载延迟，提供更好的用户体验
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setCurrentPage(prev => prev + 1);
      setIsLoading(false);
    }
  };

  const handleShowLess = () => {
    setCurrentPage(1);
    // 滚动到已完成任务区域的顶部
    const element = document.querySelector('[data-completed-tasks-section]');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (tasks.length === 0) return null;

  return (
    <div className="border-t mt-4" data-completed-tasks-section>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="w-full p-3 text-sm text-gray-500">
          <CollapsibleTrigger className="w-full flex items-center justify-between">
            <span>已完成 {tasks.length}</span>
            {isOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent>
          <Droppable droppableId="completed-tasks" isDropDisabled={!allowSorting}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={cn(
                  "pb-2",
                  snapshot.isDraggingOver && allowSorting && "bg-gray-50 rounded-md"
                )}
              >
                {paginatedData.displayedTasks.map((task, index) => (
                  <div className="px-4" key={task.id}>
                    {renderTask(task, index, allowSorting)}
                  </div>
                ))}
                {provided.placeholder}

                {/* 加载更多按钮 */}
                {paginatedData.hasMore && (
                  <div className="px-3 py-2 text-center">
                    <Button
                      variant="ghost"
                      className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
                      onClick={handleLoadMore}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          加载中...
                        </>
                      ) : (
                        `加载更多 (还有 ${tasks.length - paginatedData.displayedTasks.length} 项)`
                      )}
                    </Button>
                  </div>
                )}

                {/* 显示较少按钮 - 只在显示超过第一页时显示 */}
                {currentPage > 1 && !paginatedData.hasMore && (
                  <div className="px-3 py-2 text-center">
                    <Button
                      variant="ghost"
                      className="text-sm text-gray-500 hover:text-gray-700"
                      onClick={handleShowLess}
                    >
                      显示较少
                    </Button>
                  </div>
                )}

                {/* 分页信息显示 */}
                {tasks.length > ITEMS_PER_PAGE && (
                  <div className="px-3 py-1 text-center">
                    <span className="text-xs text-gray-400">
                      显示 {paginatedData.displayedTasks.length} / {tasks.length} 项
                      {paginatedData.totalPages > 1 && ` (第 ${currentPage} / ${paginatedData.totalPages} 页)`}
                    </span>
                  </div>
                )}
              </div>
            )}
          </Droppable>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default TasksCompleted;
