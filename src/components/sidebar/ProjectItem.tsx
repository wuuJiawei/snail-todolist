import React, { useState, useCallback, useRef } from "react";
import { Draggable, DraggableStateSnapshot } from "@hello-pangea/dnd"; // 只保留 RBD 的 Draggable
import { cn } from "@/lib/utils";
import { useTaskContext } from "@/contexts/task";
import { useProjectContext } from "@/contexts/ProjectContext";
import { Project } from "@/types/project";
import ProjectIcon from "@/components/ui/project-icon"; // 确保路径正确

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Edit, Trash2, GripVertical, Share2 } from "lucide-react";
import EditProjectDialog from "@/components/projects/EditProjectDialog"; // 确保路径正确
import ShareProjectDialog from "@/components/projects/ShareProjectDialog"; // 导入分享对话框

interface ProjectItemProps {
  project: Project;
  index?: number; // Draggable 需要 index
  isDraggable?: boolean; // 控制是否启用拖拽
}

const ProjectItem: React.FC<ProjectItemProps> = ({
  project,
  index = 0, // 提供默认值，即使不可拖拽时Draggable外层不渲染
  isDraggable = false,
}) => {
  const { selectedProject, selectProject } = useTaskContext();
  const { editProject, deleteProject } = useProjectContext(); // 不再需要 reorderProjects
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  
  // 用于恢复焦点的ref
  const itemRef = useRef<HTMLDivElement>(null);

  const isSelected = selectedProject === project.id;
  // 通过 project 对象中的属性判断是否固定，而不是 id
  const isFixedProject = project.isFixed === true;
  // 判断是否是共享的清单
  const isSharedProject = project.is_shared === true;

  const handleClick = () => {
    // 对于固定项目，直接使用其ID
    selectProject(project.id);
  };

  // 使用useCallback优化事件处理器，防止不必要的重渲染
  const handleEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止事件冒泡到 handleClick
    e.preventDefault();
    setEditDialogOpen(true);
  }, []);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止事件冒泡到 handleClick
    e.preventDefault();
    setDeleteDialogOpen(true);
  }, []);

  const handleShare = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止事件冒泡到 handleClick
    e.preventDefault();
    setShareDialogOpen(true);
  }, []);

  // 增强的对话框关闭处理器
  const handleEditDialogClose = useCallback((open: boolean) => {
    setEditDialogOpen(open);
    if (!open) {
      // 简单的清理，只重置可能影响交互的样式
      setTimeout(() => {
        document.body.style.pointerEvents = '';
        if (itemRef.current) {
          itemRef.current.focus({ preventScroll: true });
        }
      }, 50);
    }
  }, []);

  const handleShareDialogClose = useCallback((open: boolean) => {
    setShareDialogOpen(open);
    if (!open) {
      setTimeout(() => {
        document.body.style.pointerEvents = '';
        if (itemRef.current) {
          itemRef.current.focus({ preventScroll: true });
        }
      }, 50);
    }
  }, []);

  const handleDeleteDialogClose = useCallback((open: boolean) => {
    setDeleteDialogOpen(open);
    if (!open) {
      setTimeout(() => {
        document.body.style.pointerEvents = '';
        if (itemRef.current) {
          itemRef.current.focus({ preventScroll: true });
        }
      }, 50);
    }
  }, []);

  const handleConfirmDelete = async () => {
    try {
      await deleteProject(project.id);
      setDeleteDialogOpen(false);
      // 可选: 如果删除的是当前选中的项目，切换到默认项目
      if (isSelected) {
        selectProject('today'); // 或者 'recent', null 等
      }
    } catch (error) {
      console.error('删除项目失败:', error);
    }
  };

  // 渲染项目内容的核心函数
  const renderItemContent = (snapshot?: DraggableStateSnapshot) => (
    // 这个 div 是可点击和触发右键菜单的区域
    <div
      ref={itemRef}
      onClick={handleClick}
      tabIndex={0} // 添加可聚焦属性
      className={cn(
        "px-3 py-2 flex items-center gap-2 rounded-md cursor-pointer transition-colors group relative", // 添加 group 和 relative
        isSelected
          ? "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-50"
          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800",
        // 可以使用 snapshot.isDragging 来添加拖动时的样式，但通常应用在外层 div 上
        isSharedProject && "border-l-2 border-blue-500",
        "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50" // 添加焦点样式
      )}
    >
      <ProjectIcon
        icon={project.icon}
        color={project.color || (isSelected ? "#333" : "#666")} // 选中时颜色可以不同
        size={16}
        className="h-4 w-4 flex-shrink-0 flex items-center justify-center"
      />
      <span className="text-sm flex-grow truncate mr-2">
        {project.name}
        {isSharedProject && (
          <Share2 className="inline-block ml-1 h-3 w-3 text-blue-500" />
        )}
      </span> {/* 允许伸缩和截断 */}
      {project.count !== undefined && project.count > 0 && (
        <span className="ml-auto text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 bg-gray-200 dark:bg-gray-600 rounded-full px-1.5 py-0.5">
          {project.count}
        </span>
      )}
    </div>
  );

  // 渲染带交互（右键菜单、对话框）的内容
  const renderInteractiveContent = (snapshot?: DraggableStateSnapshot) => {
    const content = renderItemContent(snapshot);

    // 固定项目或者不可拖拽的项目，只显示内容，没有右键菜单
    if (isFixedProject || !isDraggable) {
      return content;
    }

    // 可拖拽的自定义项目，添加右键菜单
    return (
      <>
        <ContextMenu>
          <ContextMenuTrigger asChild>{content}</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={handleShare}>
              <Share2 className="mr-2 h-4 w-4" />
              <span>分享</span>
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={handleEdit}>
              <Edit className="mr-2 h-4 w-4" />
              <span>编辑</span>
            </ContextMenuItem>
            <ContextMenuItem onClick={handleDelete} className="text-red-600 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-900/20 dark:focus:text-red-500">
              <Trash2 className="mr-2 h-4 w-4" />
              <span>删除</span>
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        {/* 对话框放在 ContextMenu 外部，使用增强的关闭处理器 */}
        <EditProjectDialog
          open={editDialogOpen}
          onOpenChange={handleEditDialogClose}
          project={project} // 传入当前项目进行编辑
          onSave={editProject}
        />
        
        <AlertDialog open={deleteDialogOpen} onOpenChange={handleDeleteDialogClose}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确定要删除 " {project.name} " 吗？</AlertDialogTitle>
              <AlertDialogDescription>
                此操作无法撤销。这将永久删除该清单及其包含的所有任务。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800">
                确认删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <ShareProjectDialog
          open={shareDialogOpen}
          onOpenChange={handleShareDialogClose}
          project={project}
        />
      </>
    );
  };

  // --- 主要渲染逻辑 ---
  if (isDraggable) {
    // 如果可拖拽，则用 RBD 的 Draggable 包裹
    return (
      <Draggable draggableId={project.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef} // RBD 需要的 ref
            {...provided.draggableProps} // RBD 需要的拖拽属性
            {...provided.dragHandleProps} // RBD 需要的拖拽"手柄"属性（应用到整个 div）
            className={cn(
              // 可以在这里根据 snapshot.isDragging 添加拖动过程中的特殊样式
              snapshot.isDragging && "shadow-lg rounded-md bg-white dark:bg-gray-800 opacity-95 ring-2 ring-blue-500 z-50" // 拖拽时的视觉效果
            )}
          >
            {/* 渲染包含交互的内容 */}
            {renderInteractiveContent(snapshot)}
          </div>
        )}
      </Draggable>
    );
  } else {
    // 如果不可拖拽（例如固定项目），则直接渲染内容
    return renderInteractiveContent();
  }
};

export default ProjectItem;

