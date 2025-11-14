import React, { useCallback, useEffect, useRef } from "react";
import type { Ctx } from "@milkdown/ctx";
import { tooltipFactory, TooltipProvider } from "@milkdown/plugin-tooltip";
import { toggleStrongCommand, toggleEmphasisCommand } from "@milkdown/preset-commonmark";
import { toggleStrikethroughCommand } from "@milkdown/preset-gfm";
import { callCommand } from "@milkdown/utils";
import { useInstance } from "@milkdown/react";
import { usePluginViewContext } from "@prosemirror-adapter/react";
import { createRoot } from "react-dom/client";

const Toolbar: React.FC<{
  onBold: () => void;
  onItalic: () => void;
  onStrike: () => void;
}> = ({ onBold, onItalic, onStrike }) => {
  return (
    <div className="flex gap-1 bg-white/90 dark:bg-neutral-800/90 border rounded-lg shadow px-1 py-1">
      <button
        className="text-gray-700 dark:text-gray-200 bg-transparent hover:bg-slate-200 dark:hover:bg-neutral-700 rounded px-2 py-1 text-sm font-bold"
        onMouseDown={(e) => {
          e.preventDefault();
          onBold();
        }}
      >
        B
      </button>
      <button
        className="text-gray-700 dark:text-gray-200 bg-transparent hover:bg-slate-200 dark:hover:bg-neutral-700 rounded px-2 py-1 text-sm italic"
        onMouseDown={(e) => {
          e.preventDefault();
          onItalic();
        }}
      >
        I
      </button>
      <button
        className="text-gray-700 dark:text-gray-200 bg-transparent hover:bg-slate-200 dark:hover:bg-neutral-700 rounded px-2 py-1 text-sm line-through"
        onMouseDown={(e) => {
          e.preventDefault();
          onStrike();
        }}
      >
        S
      </button>
    </div>
  );
};

export const tooltip = tooltipFactory("Text");

export const TooltipView: React.FC = () => {
  const providerRef = useRef<TooltipProvider>();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const uiRootRef = useRef<ReturnType<typeof createRoot> | null>(null);
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
    if (loading) return;
    const div = document.createElement("div");
    div.className = "absolute data-[show=false]:hidden";
    containerRef.current = div;

    providerRef.current = new TooltipProvider({ content: div });

    const root = createRoot(div);
    uiRootRef.current = root;
    root.render(
      <Toolbar
        onBold={() => action(callCommand(toggleStrongCommand.key))}
        onItalic={() => action(callCommand(toggleEmphasisCommand.key))}
        onStrike={() => action(callCommand(toggleStrikethroughCommand.key))}
      />
    );

    return () => {
      const root = uiRootRef.current;
      const provider = providerRef.current;
      uiRootRef.current = null;
      providerRef.current = undefined;
      containerRef.current = null;
      Promise.resolve().then(() => {
        root?.unmount();
        provider?.destroy();
      });
    };
  }, [loading, action]);

  useEffect(() => {
    providerRef.current?.update(view, prevState);
  });

  return null;
};
