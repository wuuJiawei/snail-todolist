
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
          defaultLeftWidth={33}
          minLeftWidth={25}
          minRightWidth={30}
          className="flex-1"
        />
      </div>
    );
  }

  // 当sidebar展开时，使用嵌套的ResizablePanels
  // 比例：清单列表 20%，任务列表 40%，任务详情 40%（2:4:4）
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
            defaultLeftWidth={50}
            minLeftWidth={30}
            minRightWidth={30}
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
