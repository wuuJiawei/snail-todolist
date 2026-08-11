
import React, { useEffect, useRef } from "react";
import Sidebar from "@/components/sidebar/Sidebar";
import TaskDetail from "@/components/tasks/TaskDetail";
import { useIsMobile } from "@/hooks/use-mobile";
import TaskView from "@/components/tasks/TaskView";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useSidebar } from "@/contexts/SidebarContext";
import type { ImperativePanelHandle } from "react-resizable-panels";

const Index = () => {
  const isMobile = useIsMobile();
  const { collapsed, setCollapsed } = useSidebar();
  const projectPanelRef = useRef<ImperativePanelHandle>(null);
  const resizeStartXRef = useRef<number | null>(null);
  const hasDraggedProjectHandleRef = useRef(false);

  const handleProjectResizePointerDown = (event: React.PointerEvent) => {
    resizeStartXRef.current = event.clientX;
    hasDraggedProjectHandleRef.current = false;
  };

  const handleProjectResizePointerMove = (event: React.PointerEvent) => {
    const startX = resizeStartXRef.current;
    if (startX !== null && Math.abs(event.clientX - startX) > 4) {
      hasDraggedProjectHandleRef.current = true;
    }
  };

  const handleProjectResizeClick = () => {
    if (!hasDraggedProjectHandleRef.current) {
      projectPanelRef.current?.collapse();
    }
    resizeStartXRef.current = null;
    hasDraggedProjectHandleRef.current = false;
  };

  useEffect(() => {
    const projectPanel = projectPanelRef.current;
    if (!projectPanel) return;

    if (collapsed && !projectPanel.isCollapsed()) {
      projectPanel.collapse();
    } else if (!collapsed && projectPanel.isCollapsed()) {
      projectPanel.expand();
    }
  }, [collapsed]);

  if (isMobile) {
    return (
      <div className="flex h-screen w-full overflow-hidden bg-white">
        <TaskView />
      </div>
    );
  }

  return (
    <div className="h-screen w-full overflow-hidden bg-white">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel
          ref={projectPanelRef}
          id="project-list"
          order={1}
          defaultSize={20}
          minSize={15}
          maxSize={32}
          collapsible
          collapsedSize={0}
          onCollapse={() => setCollapsed(true)}
          onExpand={() => setCollapsed(false)}
          className="overflow-hidden"
        >
          <Sidebar />
        </ResizablePanel>

        <ResizableHandle
          withHandle
          onPointerDownCapture={handleProjectResizePointerDown}
          onPointerMoveCapture={handleProjectResizePointerMove}
          onClick={handleProjectResizeClick}
          aria-label="调整清单列表宽度；单击收起清单"
          title="拖动调整清单宽度，单击收起"
          className={collapsed ? "pointer-events-none opacity-0" : undefined}
        />

        <ResizablePanel
          id="task-list"
          order={2}
          defaultSize={40}
          minSize={25}
          className="overflow-hidden"
        >
          <TaskView />
        </ResizablePanel>

        <ResizableHandle
          withHandle
          aria-label="调整任务列表与任务详情宽度"
          title="拖动调整任务列表与任务详情宽度"
        />

        <ResizablePanel
          id="task-detail"
          order={3}
          defaultSize={40}
          minSize={30}
          className="overflow-hidden"
        >
          <TaskDetail />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

export default Index;
