
import React from "react";
import Sidebar from "@/components/sidebar/Sidebar";
import TaskDetail from "@/components/tasks/TaskDetail";
import { useIsMobile } from "@/hooks/use-mobile";
import TaskView from "@/components/tasks/TaskView";
import ResizablePanels from "@/components/ui/resizable-panels";
import { useSidebar } from "@/contexts/SidebarContext";

const Index = () => {
  const isMobile = useIsMobile();
  const { collapsed } = useSidebar();

  if (isMobile) {
    return (
      <div className="flex h-screen w-full overflow-hidden bg-white">
        <TaskView />
      </div>
    );
  }

  // 当sidebar折叠时，使用简单布局
  if (collapsed) {
    return (
      <div className="flex h-screen w-full overflow-hidden bg-white">
        <Sidebar />
        <ResizablePanels
          key="collapsed-panels"
          leftPanel={<TaskView />}
          rightPanel={<TaskDetail />}
          defaultLeftWidth={60}
          minLeftWidth={30}
          minRightWidth={25}
          className="flex-1"
        />
      </div>
    );
  }

  // 当sidebar展开时，使用嵌套的ResizablePanels
  return (
    <div className="flex h-screen w-full overflow-hidden bg-white">
      <ResizablePanels
        key="main-panels"
        leftPanel={<Sidebar />}
        rightPanel={
          <ResizablePanels
            key="content-panels"
            leftPanel={<TaskView />}
            rightPanel={<TaskDetail />}
            defaultLeftWidth={60}
            minLeftWidth={30}
            minRightWidth={25}
          />
        }
        defaultLeftWidth={20}
        minLeftWidth={15}
        minRightWidth={60}
      />
    </div>
  );
};

export default Index;
