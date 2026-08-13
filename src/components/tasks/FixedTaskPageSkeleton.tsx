import React from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface FixedTaskPageSkeletonProps {
  variant: "timeline" | "archive";
  showDateStrip?: boolean;
  showQuickAdd?: boolean;
  actionCount?: number;
  label?: string;
}

const FixedTaskPageSkeleton: React.FC<FixedTaskPageSkeletonProps> = ({
  variant,
  showDateStrip = false,
  showQuickAdd = false,
  actionCount = 1,
  label = "正在加载任务",
}) => {
  const compact = variant === "timeline";

  return (
    <div
      className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background"
      data-skeleton-layout={variant}
      aria-label={label}
      aria-busy="true"
    >
      <section className="relative shrink-0 overflow-hidden border-b bg-muted/20">
        <Skeleton className="absolute inset-0 h-full w-full rounded-none opacity-70" />
        <div
          className={cn(
            "relative flex px-8 lg:px-10",
            compact
              ? "min-h-[128px] items-start justify-between gap-4 py-5"
              : "min-h-[230px] flex-col justify-between py-7",
          )}
        >
          <div className={cn("space-y-5", compact ? "flex items-center gap-2 space-y-0" : "max-w-xl")}>
            <Skeleton className={cn("shrink-0 rounded-full", compact ? "h-6 w-6" : "h-8 w-8")} />
            <Skeleton className={cn(compact ? "h-7 w-24" : "h-9 w-32")} />
            {!compact && (
              <>
                <Skeleton className="h-4 w-[min(420px,60vw)]" />
                <Skeleton className="h-4 w-24" />
              </>
            )}
          </div>

          <div
            className={cn("flex shrink-0 items-center gap-2", !compact && "self-end")}
            data-skeleton-section="hero-actions"
          >
            {Array.from({ length: actionCount }).map((_, index) => (
              <Skeleton key={index} className={cn("rounded-md", compact ? "h-8 w-8" : "h-9 w-24")} />
            ))}
          </div>
        </div>
      </section>

      {showQuickAdd && (
        <div className="shrink-0 px-4 py-2" data-skeleton-section="quick-add">
          <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/20 px-2 py-2">
            <Skeleton className="h-5 w-5 shrink-0 rounded-full" />
            <Skeleton className="h-6 min-w-0 flex-1" />
            <Skeleton className="h-7 w-[148px] shrink-0" />
            <Skeleton className="h-6 w-8 shrink-0" />
          </div>
        </div>
      )}

      {showDateStrip && (
        <div
          className="shrink-0 border-t border-border/50 px-3 py-3 lg:px-6"
          data-skeleton-section="date-strip"
        >
          <div className="mx-auto flex max-w-5xl items-center gap-1">
            <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
            <div className="flex min-w-0 flex-1 justify-between gap-1">
              {Array.from({ length: 7 }).map((_, index) => (
                <Skeleton key={index} className="h-[52px] min-w-[52px] flex-1 rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
          </div>
        </div>
      )}

      <div className={cn("flex-1 overflow-hidden", compact ? "px-6 py-5 lg:px-10" : "px-8 py-5 lg:px-10")}>
        <div className="relative max-w-5xl">
          {Array.from({ length: compact ? 3 : 4 }).map((_, groupIndex) => (
            <section key={groupIndex} className="relative pb-4 last:pb-1">
              <div className="absolute bottom-0 left-[5px] top-[18px] w-px bg-border" />
              <div className="relative flex items-center gap-3">
                <Skeleton className="relative z-10 h-[11px] w-[11px] shrink-0 rounded-full" />
                <Skeleton className={cn("h-4", groupIndex % 2 === 0 ? "w-24" : "w-32")} />
                {compact && <Skeleton className="h-5 w-7 rounded-full" />}
              </div>

              <div className="ml-6 mt-1 divide-y divide-border/40">
                {Array.from({ length: groupIndex === 0 ? 2 : 1 }).map((_, taskIndex) => (
                  <div key={taskIndex} className="flex min-h-[42px] items-center gap-3 px-2 py-1.5">
                    {compact && <Skeleton className="h-4 w-4 shrink-0 rounded-full" />}
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <Skeleton className={cn("h-4", taskIndex % 2 === 0 ? "w-2/3" : "w-1/2")} />
                      <Skeleton className="h-3 w-28" />
                    </div>
                    <Skeleton className="h-4 w-20 shrink-0" />
                    <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FixedTaskPageSkeleton;
