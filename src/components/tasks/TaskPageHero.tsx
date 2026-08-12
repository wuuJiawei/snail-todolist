import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TaskPageHeroProps {
  title: string;
  heroImage: string;
  description?: string;
  metadata?: ReactNode;
  actions?: ReactNode;
  compact?: boolean;
  imagePosition?: string;
}

const TaskPageHero: React.FC<TaskPageHeroProps> = ({
  title,
  heroImage,
  description,
  metadata,
  actions,
  compact = false,
  imagePosition = "object-right",
}) => (
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
      <div className="max-w-xl">
        <h1
          className={cn(
            "font-semibold tracking-tight text-foreground",
            compact ? "text-2xl" : "text-3xl",
          )}
        >
          {title}
        </h1>
        {description && (
          <p className="mt-5 text-sm leading-6 text-muted-foreground">{description}</p>
        )}
        {metadata && (
          <p className="mt-6 text-sm font-medium text-muted-foreground">{metadata}</p>
        )}
      </div>

      {actions && <div className="flex flex-wrap items-center gap-2 self-end">{actions}</div>}
    </div>
  </section>
);

export default TaskPageHero;
