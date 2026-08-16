import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Task } from "@/types/task";

import CalendarMoreDialog from "./CalendarMoreDialog";

const tasks: Task[] = [
  { id: "task-1", title: "未完成任务", completed: false },
  { id: "task-2", title: "已完成任务", completed: true },
];

let root: Root | null = null;
let container: HTMLDivElement | null = null;

const renderDialog = async (overrides: Partial<React.ComponentProps<typeof CalendarMoreDialog>> = {}) => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  const props: React.ComponentProps<typeof CalendarMoreDialog> = {
    date: new Date(2026, 7, 13),
    open: true,
    tasks,
    onOpenChange: vi.fn(),
    onOpenTask: vi.fn(),
    onToggleTask: vi.fn(async () => undefined),
    ...overrides,
  };

  await act(async () => {
    root?.render(React.createElement(CalendarMoreDialog, props));
  });

  return props;
};

describe("CalendarMoreDialog", () => {
  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(async () => {
    if (root) await act(async () => root?.unmount());
    container?.remove();
    root = null;
    container = null;
  });

  it("renders the selected date and all task titles in a dialog", async () => {
    await renderDialog();

    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    expect(document.body.textContent).toContain("8月13日 星期四");
    expect(document.body.textContent).toContain("共 2 项任务");
    expect(document.body.textContent).toContain("未完成任务");
    expect(document.body.textContent).toContain("已完成任务");
  });

  it("keeps checkbox and title actions independent", async () => {
    const onOpenTask = vi.fn();
    const onToggleTask = vi.fn(async () => undefined);
    await renderDialog({ onOpenTask, onToggleTask });

    const checkbox = document.querySelector('[aria-label="将“未完成任务”标记为已完成"]') as HTMLButtonElement;
    await act(async () => {
      checkbox.click();
      await Promise.resolve();
    });

    expect(onToggleTask).toHaveBeenCalledWith(tasks[0], true);
    expect(onOpenTask).not.toHaveBeenCalled();

    const title = Array.from(document.querySelectorAll("button")).find((button) => (
      button.textContent === "未完成任务"
    )) as HTMLButtonElement;
    await act(async () => title.click());

    expect(onOpenTask).toHaveBeenCalledWith(tasks[0]);
  });
});
