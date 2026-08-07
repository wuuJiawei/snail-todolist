import { describe, expect, it } from "vitest";
import { getChangedTaskTitle } from "./taskUtils";

describe("getChangedTaskTitle", () => {
  it("returns a title only when its persisted value changes", () => {
    expect(getChangedTaskTitle("Original", "Original")).toBeNull();
    expect(getChangedTaskTitle("Original", "  Original  ")).toBeNull();
    expect(getChangedTaskTitle("Original", "   ")).toBeNull();
    expect(getChangedTaskTitle("Original", "  Updated  ")).toBe("Updated");
  });
});
