import type { DataProvider, DataProviderType } from "./dataProvider";
import { createSupabaseDataProvider } from "./providers/supabase/createSupabaseDataProvider";

export function parseDataProviderType(value: string | undefined): DataProviderType {
  const normalized = value?.trim() || "supabase";
  if (normalized === "supabase" || normalized === "self-host") return normalized;
  throw new Error(`Unsupported data provider: ${normalized}`);
}

export function createDataProvider(type: DataProviderType): DataProvider {
  switch (type) {
    case "supabase":
      return createSupabaseDataProvider();
    case "self-host":
      throw new Error("Self-host data provider is not implemented");
  }
}

let instance: DataProvider | null = null;

export function getDataProvider(): DataProvider {
  if (!instance) instance = createDataProvider(parseDataProviderType(import.meta.env.VITE_DATA_PROVIDER));
  return instance;
}

export function resetDataProvider(): void {
  instance = null;
}
