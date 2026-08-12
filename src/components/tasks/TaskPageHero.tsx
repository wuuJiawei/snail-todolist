import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TaskPageHeroProps {
  title: string;
  titleIcon?: ReactNode;
  heroImage: string;
  description?: string;
  metadata?: ReactNode;
  actions?: ReactNode;
  compact?: boolean;
  imagePosition?: string;
}

const TaskPageHero: React.FC<TaskPageHeroProps> = ({
  title,
  titleIcon,
  heroImage,
  description,
  metadata,
  actions,
  compact = false,
  imagePosition = "object-right",
}) => {
  const titleRow = (
    <div className="flex min-w-0 items-center gap-2">
      {titleIcon && <span className="shrink-0">{titleIcon}</span>}
      <h1
        className={cn(
          "truncate font-semibold tracking-tight text-foreground",
          compact ? "text-2xl" : "text-3xl",
        )}
      >
        {title}
      </h1>
    </div>
  );

  return (
    <section className="relative overflow-hidden border-b bg-background">
      <img
        src={heroImage}
        alt=""
        aria-hidden="true"
        loading="eager"
        decoding="sync"
        fetchPriority="high"
        className={cn(
          "pointer-events-none absolute inset-0 h-full w-full max-w-none object-cover",
          imagePosition,
        )}
      />

      <div
        className={cn(
          "relative flex flex-col justify-between px-8 lg:px-10",
          compact ? "min-h-[128px] py-5" : "min-h-[230px] py-7",
        )}
      >
        {compact ? (
          <div className="flex items-center justify-between gap-4">
            {titleRow}
            {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
          </div>
        ) : (
          <>
            <div className="max-w-xl">
              {titleRow}
              {description && (
                <p className="mt-5 text-sm leading-6 text-muted-foreground">{description}</p>
              )}
              {metadata && (
                <p className="mt-6 text-sm font-medium text-muted-foreground">{metadata}</p>
              )}
            </div>

            {actions && <div className="flex flex-wrap items-center gap-2 self-end">{actions}</div>}
          </>
        )}
      </div>
    </section>
  );
};

export default TaskPageHero;
