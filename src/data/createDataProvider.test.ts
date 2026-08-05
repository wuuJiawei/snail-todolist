import { describe, expect, it } from "vitest";
import { createDataProvider, parseDataProviderType } from "./createDataProvider";

describe("data provider factory", () => {
  it("uses Supabase when configuration is omitted", () => {
    expect(parseDataProviderType(undefined)).toBe("supabase");
  });

  it("creates the registered Supabase provider", () => {
    const provider = createDataProvider("supabase");
    expect(provider.tasks).toBeDefined();
    expect(provider.auth).toBeDefined();
  });

  it("reserves self-host without silently falling back", () => {
    expect(() => createDataProvider("self-host")).toThrow("Self-host data provider is not implemented");
  });

  it("rejects an invalid configured provider", () => {
    expect(() => parseDataProviderType("local")).toThrow("Unsupported data provider: local");
  });
});
