export type DataErrorCode =
  | "AUTH_REQUIRED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION"
  | "NETWORK"
  | "UNAVAILABLE"
  | "UNKNOWN";

export class DataError extends Error {
  constructor(
    public readonly code: DataErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "DataError";
  }
}

export function isDataError(error: unknown): error is DataError {
  return error instanceof DataError;
}
