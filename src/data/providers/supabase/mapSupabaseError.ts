import { DataError, type DataErrorCode } from "@/data/contracts/errors";

interface SupabaseErrorLike {
  code?: string;
  message?: string;
  status?: number;
}

const CODE_MAP: Record<string, DataErrorCode> = {
  "23505": "CONFLICT",
  "23503": "VALIDATION",
  "22P02": "VALIDATION",
  PGRST116: "NOT_FOUND",
};

export function mapSupabaseError(error: unknown, fallback = "数据操作失败"): DataError {
  if (error instanceof DataError) return error;

  const candidate = error && typeof error === "object" ? error as SupabaseErrorLike : undefined;
  let code = candidate?.code ? CODE_MAP[candidate.code] : undefined;
  if (!code && (candidate?.status === 401 || candidate?.status === 403)) {
    code = candidate.status === 401 ? "AUTH_REQUIRED" : "FORBIDDEN";
  }
  if (!code && candidate?.status === 404) code = "NOT_FOUND";
  if (!code && candidate?.status && candidate.status >= 500) code = "UNAVAILABLE";

  const message = candidate?.message || (error instanceof Error ? error.message : fallback);
  return new DataError(code ?? "UNKNOWN", message, error);
}

export async function withSupabaseError<T>(operation: () => Promise<T>, fallback?: string): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw mapSupabaseError(error, fallback);
  }
}
