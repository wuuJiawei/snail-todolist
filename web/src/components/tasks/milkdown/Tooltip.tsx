import React, { useCallback, useEffect, useRef } from "react";
import type { Ctx } from "@milkdown/kit/ctx";
import { tooltipFactory, TooltipProvider } from "@milkdown/kit/plugin/tooltip";
import { toggleStrongCommand, toggleEmphasisCommand, toggleInlineCodeCommand } from "@milkdown/kit/preset/commonmark";
import { toggleStrikethroughCommand } from "@milkdown/kit/preset/gfm";
import { callCommand } from "@milkdown/kit/utils";
import { useInstance } from "@milkdown/react";
import { usePluginViewContext } from "@prosemirror-adapter/react";

export const tooltip = tooltipFactory("Text");

export const TooltipView: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const tooltipProvider = useRef<TooltipProvider>();
  const { view, prevState } = usePluginViewContext();
  const [loading, get] = useInstance();

  const action = useCallback(
    (fn: (ctx: Ctx) => void) => {
      if (loading) return;
      get().action(fn);
    },
    [loading, get]
  );

  useEffect(() => {
    const div = ref.current;
    if (loading || !div) return;

    tooltipProvider.current = new TooltipProvider({
      content: div,
    });

    return () => {
      tooltipProvider.current?.destroy();
    };
  }, [loading]);

  useEffect(() => {
    tooltipProvider.current?.update(view, prevState);
  });

  return (
    <div ref={ref} className="absolute data-[show=false]:hidden">
      <div className="flex gap-1 bg-white/90 dark:bg-neutral-800/90 border rounded-lg shadow px-1 py-1">
        <button
          className="text-gray-700 dark:text-gray-200 bg-transparent hover:bg-slate-200 dark:hover:bg-neutral-700 rounded px-2 py-1 text-sm font-bold"
          onMouseDown={(e) => {
            e.preventDefault();
            action(callCommand(toggleStrongCommand.key));
          }}
        >
          B
        </button>
        <button
          className="text-gray-700 dark:text-gray-200 bg-transparent hover:bg-slate-200 dark:hover:bg-neutral-700 rounded px-2 py-1 text-sm italic"
          onMouseDown={(e) => {
            e.preventDefault();
            action(callCommand(toggleEmphasisCommand.key));
          }}
        >
          I
        </button>
        <button
          className="text-gray-700 dark:text-gray-200 bg-transparent hover:bg-slate-200 dark:hover:bg-neutral-700 rounded px-2 py-1 text-sm line-through"
          onMouseDown={(e) => {
            e.preventDefault();
            action(callCommand(toggleStrikethroughCommand.key));
          }}
        >
          S
        </button>
        <button
          className="text-gray-700 dark:text-gray-200 bg-transparent hover:bg-slate-200 dark:hover:bg-neutral-700 rounded px-2 py-1 text-sm font-mono"
          onMouseDown={(e) => {
            e.preventDefault();
            action(callCommand(toggleInlineCodeCommand.key));
          }}
          title="行内代码"
        >
          {"</>"}
        </button>
      </div>
    </div>
  );
};
