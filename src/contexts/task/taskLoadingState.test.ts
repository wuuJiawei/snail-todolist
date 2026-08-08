import { describe, expect, it } from "vitest";
import { isTaskListInitiallyLoading } from "./taskLoadingState";

describe("isTaskListInitiallyLoading", () => {
  it("keeps the skeleton visible until tags for loaded tasks are ready", () => {
    expect(isTaskListInitiallyLoading(true, false, 3, true)).toBe(true);
    expect(isTaskListInitiallyLoading(true, false, 3, false)).toBe(false);
  });

  it("does not wait for a disabled tag query when the task list is empty", () => {
    expect(isTaskListInitiallyLoading(true, false, 0, true)).toBe(false);
  });

  it("does not show a loading state when data access is disabled", () => {
    expect(isTaskListInitiallyLoading(false, true, 3, true)).toBe(false);
  });
});
