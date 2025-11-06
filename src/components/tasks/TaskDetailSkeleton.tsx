import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

const TaskDetailSkeleton: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      <div className="p-3 flex items-center justify-between border-b">
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-6 w-56" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 flex flex-col space-y-4">
        <div className="space-y-3">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20 rounded-md" />
            <Skeleton className="h-6 w-16 rounded-md" />
            <Skeleton className="h-6 w-16 rounded-md" />
          </div>
          <div className="flex gap-3 text-xs text-gray-500">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>

        <div className="flex-1">
          <Skeleton className="h-full min-h-[320px] w-full rounded-lg" />
        </div>

        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-12 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetailSkeleton;

