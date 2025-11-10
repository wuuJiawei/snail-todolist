import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

const TaskDetailSkeleton: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-muted/10">
      <div className="p-3 flex items-center justify-between border-b bg-background">
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-6 w-px" />
          <Skeleton className="h-7 w-36 rounded-md" />
        </div>
        <div className="flex items-center gap-1">
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5 flex flex-col gap-6">
        <section className="bg-background border border-border/60 rounded-xl shadow-sm px-5 py-4 space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-5 w-1/3" />
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-6 w-20 rounded-full" />
            ))}
          </div>
          <div className="space-y-1">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-36" />
          </div>
        </section>

        <section className="bg-background border border-border/60 rounded-xl shadow-sm px-5 py-4 flex-1 flex flex-col">
          <div className="space-y-4 flex-1 flex flex-col">
            <div className="flex items-center gap-3">
              <Skeleton className="h-7 w-32 rounded-md" />
              <Skeleton className="h-7 w-20 rounded-md" />
            </div>
            <Skeleton className="flex-1 min-h-[360px] w-full rounded-lg" />
          </div>
        </section>
      </div>
    </div>
  );
};

export default TaskDetailSkeleton;
