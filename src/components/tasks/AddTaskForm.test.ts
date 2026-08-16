import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import AddTaskForm from "./AddTaskForm";
import type { Project } from "@/types/project";

vi.mock("./TaskDatePickerContent", () => ({
  default: () => null,
}));

let root: Root | null = null;
let container: HTMLDivElement | null = null;

const renderForm = async (props: React.ComponentProps<typeof AddTaskForm>) => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  await act(async () => {
    root?.render(React.createElement(AddTaskForm, props));
  });

  return container;
};

const enterTitle = async (rendered: HTMLElement, title: string) => {
  const input = rendered.querySelector("input") as HTMLInputElement;
  await act(async () => {
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    valueSetter?.call(input, title);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

const submit = async (rendered: HTMLElement) => {
  const form = rendered.querySelector("form") as HTMLFormElement;
  await act(async () => {
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await Promise.resolve();
  });
};

describe("AddTaskForm", () => {
  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(async () => {
    if (root) {
      await act(async () => root?.unmount());
    }
    container?.remove();
    root = null;
    container = null;
  });

  it("keeps the existing quick-add behavior when project selection is not configured", async () => {
    const onAddTask = vi.fn(async () => undefined);
    const defaultDate = new Date("2026-08-13T00:00:00.000Z");
    const rendered = await renderForm({ onAddTask, isSubmitting: false, defaultDate });

    await enterTitle(rendered, "整理今日计划");
    await submit(rendered);

    expect(onAddTask).toHaveBeenCalledWith(
      "整理今日计划",
      { type: "date", start: defaultDate },
      undefined,
    );
  });

  it("blocks submission when a required project has not been selected", async () => {
    const onAddTask = vi.fn(async () => undefined);
    const projects: Project[] = [{ id: "project-1", name: "工作", icon: "folder", count: 0 }];
    const rendered = await renderForm({
      onAddTask,
      isSubmitting: false,
      projectSelection: { projects, required: true },
    });

    await enterTitle(rendered, "必须归入清单");
    await submit(rendered);

    expect(onAddTask).not.toHaveBeenCalled();
    expect(rendered.querySelector('[aria-label="选择清单"]')?.getAttribute("aria-invalid")).toBe("true");
  });
});
