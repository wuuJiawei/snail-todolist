import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import FixedTaskPageSkeleton from "./FixedTaskPageSkeleton";
import TaskListSkeleton from "./TaskListSkeleton";

let root: Root | null = null;
let container: HTMLDivElement | null = null;

const renderSkeleton = async (element: React.ReactElement) => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  await act(async () => {
    root?.render(element);
  });

  return container;
};

describe("fixed task page skeletons", () => {
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

  it("matches the Today layout with quick add but no date strip", async () => {
    const rendered = await renderSkeleton(React.createElement(TaskListSkeleton, {
      selectedProject: "today",
    }));

    expect(rendered.querySelector('[data-skeleton-layout="timeline"]')).not.toBeNull();
    expect(rendered.querySelector('[data-skeleton-section="quick-add"]')).not.toBeNull();
    expect(rendered.querySelector('[data-skeleton-section="date-strip"]')).toBeNull();
  });

  it("matches the Recent layout with a date strip but no quick add", async () => {
    const rendered = await renderSkeleton(React.createElement(TaskListSkeleton, {
      selectedProject: "recent",
    }));

    expect(rendered.querySelector('[data-skeleton-layout="timeline"]')).not.toBeNull();
    expect(rendered.querySelector('[data-skeleton-section="date-strip"]')).not.toBeNull();
    expect(rendered.querySelector('[data-skeleton-section="quick-add"]')).toBeNull();
  });

  it("matches the Flagged layout without extra controls", async () => {
    const rendered = await renderSkeleton(React.createElement(TaskListSkeleton, {
      selectedProject: "flagged",
    }));

    expect(rendered.querySelector('[data-skeleton-layout="timeline"]')).not.toBeNull();
    expect(rendered.querySelector('[data-skeleton-section="date-strip"]')).toBeNull();
    expect(rendered.querySelector('[data-skeleton-section="quick-add"]')).toBeNull();
  });

  it("matches archive pages with a large hero and configurable actions", async () => {
    const rendered = await renderSkeleton(React.createElement(FixedTaskPageSkeleton, {
      variant: "archive",
      actionCount: 2,
    }));

    expect(rendered.querySelector('[data-skeleton-layout="archive"]')).not.toBeNull();
    expect(rendered.querySelector('[data-skeleton-section="hero-actions"]')?.children).toHaveLength(2);
    expect(rendered.querySelector('[data-skeleton-section="date-strip"]')).toBeNull();
    expect(rendered.querySelector('[data-skeleton-section="quick-add"]')).toBeNull();
  });
});
