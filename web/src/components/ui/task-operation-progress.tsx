import React from "react";
import { cn } from "@/lib/utils";

export type TaskOperationType = "complete" | "abandon" | "delete" | "restore" | "update";

interface TaskOperationProgressProps {
  isVisible: boolean;
  operationType: TaskOperationType;
  progress: number; // 0-100
  className?: string;
}

const getOperationStyle = (type: TaskOperationType) => {
  switch (type) {
    case "complete":
      return "bg-green-500/70";
    case "abandon":
      return "bg-yellow-500/70";
    case "delete":
      return "bg-red-500/70";
    case "restore":
      return "bg-blue-500/70";
    case "update":
      return "bg-gray-500/70";
    default:
      return "bg-gray-500/70";
  }
};

const TaskOperationProgress: React.FC<TaskOperationProgressProps> = ({
  isVisible,
  operationType,
  progress,
  className,
}) => {
  if (!isVisible) return null;

  return (
    <div className={cn(
      "absolute inset-0 overflow-hidden rounded-md z-10",
      className
    )}>
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50" />
      
      {/* 进度条 */}
      <div 
        className={cn(
          "absolute inset-y-0 left-0 transition-all duration-200 ease-out",
          getOperationStyle(operationType)
        )}
        style={{ 
          width: `${progress}%`,
          transition: progress >= 100 ? 'width 0.2s ease-out' : 'width 0.2s ease-out'
        }}
      />
      
      {/* 动画闪光效果 */}
      <div 
        className={cn(
          "absolute inset-y-0 h-full w-4 bg-gradient-to-r from-transparent via-white/30 to-transparent",
          "transition-all duration-300 ease-out",
          getOperationStyle(operationType).includes("green") && "via-green-200/50",
          getOperationStyle(operationType).includes("yellow") && "via-yellow-200/50",
          getOperationStyle(operationType).includes("red") && "via-red-200/50",
          getOperationStyle(operationType).includes("blue") && "via-blue-200/50",
        )}
        style={{ 
          left: `${Math.max(0, progress - 20)}%`,
          opacity: progress > 10 ? 1 : 0 
        }}
      />
    </div>
  );
};

export default TaskOperationProgress; 