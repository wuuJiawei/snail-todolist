import { describe, expect, it } from "vitest";
import { DataError } from "@/data/contracts/errors";
import { mapSupabaseError } from "./mapSupabaseError";

describe("Supabase error mapping", () => {
  it.each([
    ["23505", "CONFLICT"],
    ["23503", "VALIDATION"],
    ["PGRST116", "NOT_FOUND"],
  ] as const)("maps %s to %s", (source, expected) => {
    expect(mapSupabaseError({ code: source, message: "failed" }).code).toBe(expected);
  });

  it("preserves an existing domain error", () => {
    const error = new DataError("FORBIDDEN", "denied");
    expect(mapSupabaseError(error)).toBe(error);
  });

  it("does not expose an SDK-specific error type", () => {
    const error = mapSupabaseError({ status: 503, message: "down" });
    expect(error).toBeInstanceOf(DataError);
    expect(error).toMatchObject({ code: "UNAVAILABLE", message: "down" });
  });
});
