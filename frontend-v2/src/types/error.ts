export type ApiErrorCode =
  | "NETWORK_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "CONFIRMATION_REQUIRED"
  | "REQUEST_IN_PROGRESS"
  | "SERVER_ERROR"
  | "UNKNOWN_ERROR";

export interface ApiErrorOptions {
  status?: number;
  code?: ApiErrorCode;
  details?: unknown;
  cause?: unknown;
}
