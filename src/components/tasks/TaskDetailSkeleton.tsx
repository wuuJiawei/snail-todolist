import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

const TaskDetailSkeleton: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-muted/10">
      <div className="p-3 flex items-center justify-between border-b bg-background">
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-6 w-40" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5 flex flex-col gap-6">
        <section className="bg-background border border-border/60 rounded-xl shadow-sm px-5 py-4 space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </section>

        <section className="bg-background border border-border/60 rounded-xl shadow-sm px-5 py-4 flex-1 flex flex-col gap-4">
          <Skeleton className="h-full min-h-[320px] w-full rounded-lg" />
          <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
            <Skeleton className="h-12 w-full rounded-md" />
            <Skeleton className="h-12 w-full rounded-md" />
          </div>
        </section>
      </div>
    </div>
  );
};

export default TaskDetailSkeleton;

