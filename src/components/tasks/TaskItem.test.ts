import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import TaskItem from "./TaskItem";
import type { Task } from "@/types/task";

const mocks = vi.hoisted(() => ({
  selectTask: vi.fn(),
  updateTask: vi.fn(async () => undefined),
}));

vi.mock("@/contexts/task", () => ({
  useTaskContext: () => ({
    selectTask: mocks.selectTask,
    updateTask: mocks.updateTask,
    moveToTrash: vi.fn(),
    selectedTask: null,
    addTask: vi.fn(),
    abandonTask: vi.fn(),
    restoreAbandonedTask: vi.fn(),
    getTaskTags: () => [],
    listAllTags: vi.fn(),
    attachTagToTask: vi.fn(),
    detachTagFromTask: vi.fn(),
    createTag: vi.fn(),
  }),
}));

vi.mock("@/contexts/ProjectContext", () => ({
  useProjectContext: () => ({ projects: [] }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/components/ui/icon-park", () => ({
  Icon: () => null,
}));

vi.mock("@/components/ui/project-icon", () => ({
  default: () => null,
}));

vi.mock("./TaskDatePickerContent", () => ({
  default: () => null,
}));

vi.mock("./TagSelector", () => ({
  default: () => null,
}));

vi.mock("@/components/ui/context-menu", () => {
  const Passthrough = ({ children }: { children?: React.ReactNode }) => children;

  return {
    ContextMenu: Passthrough,
    ContextMenuContent: Passthrough,
    ContextMenuItem: Passthrough,
    ContextMenuTrigger: Passthrough,
    ContextMenuSeparator: () => null,
    ContextMenuSub: Passthrough,
    ContextMenuSubContent: Passthrough,
    ContextMenuSubTrigger: Passthrough,
  };
});

vi.mock("@hello-pangea/dnd", () => ({
  Draggable: ({ children }: {
    children: (
      provided: {
        innerRef: () => void;
        draggableProps: Record<string, never>;
        dragHandleProps: Record<string, never>;
      },
      snapshot: { isDragging: boolean },
    ) => React.ReactNode;
  }) => children(
    { innerRef: () => undefined, draggableProps: {}, dragHandleProps: {} },
    { isDragging: false },
  ),
}));

const task: Task = {
  id: "task-1",
  title: "完整任务项可编辑",
  completed: false,
};

let root: Root | null = null;
let container: HTMLDivElement | null = null;

const renderTaskItem = async (props: { isDraggable?: boolean; index?: number } = {}) => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  await act(async () => {
    root?.render(React.createElement(TaskItem, { task, ...props }));
  });

  return container;
};

describe("TaskItem", () => {
  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    mocks.selectTask.mockReset();
    mocks.updateTask.mockReset().mockResolvedValue(undefined);
  });

  afterEach(async () => {
    if (root) {
      await act(async () => root?.unmount());
    }
    container?.remove();
    root = null;
    container = null;
  });

  it("enters title editing when the task row itself is clicked", async () => {
    const rendered = await renderTaskItem();
    const row = rendered.querySelector(".task-item") as HTMLDivElement;

    expect(rendered.querySelector("input")).toBeNull();

    await act(async () => {
      row.click();
    });

    const input = rendered.querySelector("input") as HTMLInputElement;
    expect(mocks.selectTask).toHaveBeenCalledOnce();
    expect(mocks.selectTask).toHaveBeenCalledWith(task.id);
    expect(input.value).toBe(task.title);
    expect(document.activeElement).toBe(input);
  });

  it("keeps checkbox clicks isolated from title editing", async () => {
    const rendered = await renderTaskItem();
    const checkbox = rendered.querySelector('[role="checkbox"]') as HTMLButtonElement;

    await act(async () => {
      checkbox.click();
      await Promise.resolve();
    });

    expect(mocks.updateTask).toHaveBeenCalledWith(task.id, { completed: true });
    expect(mocks.selectTask).not.toHaveBeenCalled();
    expect(rendered.querySelector("input")).toBeNull();
  });

  it("keeps drag handle clicks isolated from title editing", async () => {
    const rendered = await renderTaskItem({ isDraggable: true, index: 0 });
    const dragHandle = rendered.querySelector(".cursor-grab") as HTMLDivElement;

    await act(async () => {
      dragHandle.click();
    });

    expect(mocks.selectTask).not.toHaveBeenCalled();
    expect(rendered.querySelector("input")).toBeNull();
  });
});
