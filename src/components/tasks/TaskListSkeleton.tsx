import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

const TaskListSkeleton: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>

      {/* Add task form */}
      <div className="px-4 py-3 border-b">
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-8 flex-1" />
          <Skeleton className="h-7 w-20 rounded-md" />
        </div>
      </div>

      {/* Task list skeleton */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-4">
        {[...Array(6)].map((_, index) => (
          <div key={index} className="px-4">
            <div className="flex gap-3 py-3 border-b border-border/40 last:border-b-0">
              <Skeleton className="h-5 w-5 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <div className="flex gap-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-12" />
                </div>
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-6 w-6 rounded-full" />
            </div>
          </div>
        ))}
      </div>

      {/* Bottom collapsed sections placeholder */}
      <div className="border-t px-4 py-3 space-y-2">
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
    </div>
  );
};

export default TaskListSkeleton;

