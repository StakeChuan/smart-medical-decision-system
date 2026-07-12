import type { ApiErrorCode, ApiErrorOptions } from "@/types/error";

const SESSION_KEY = "smart-medical-v2-session";

function resolveApiBase() {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  if (!window.location.hostname || window.location.protocol === "file:") return "http://127.0.0.1:8000";
  if (["127.0.0.1", "localhost"].includes(window.location.hostname)) return "http://127.0.0.1:8000";
  return `${window.location.protocol}//${window.location.hostname}:8000`;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly details?: unknown;
  override readonly cause?: unknown;

  constructor(message: string, options: ApiErrorOptions = {}) {
    super(message, { cause: options.cause });
    this.name = "ApiError";
    this.status = options.status ?? 0;
    this.code = options.code ?? "UNKNOWN_ERROR";
    this.details = options.details;
    this.cause = options.cause;
  }
}

function codeForStatus(status: number): ApiErrorCode {
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 422) return "VALIDATION_ERROR";
  if (status >= 500) return "SERVER_ERROR";
  return "UNKNOWN_ERROR";
}

function formatValidationDetails(detail: unknown): string | null {
  if (!Array.isArray(detail)) return null;
  const messages = detail
    .map((item) => {
      if (typeof item !== "object" || item === null) return null;
      const record = item as Record<string, unknown>;
      return typeof record.msg === "string" ? record.msg : null;
    })
    .filter((item): item is string => Boolean(item));
  return messages.length ? messages.join("；") : null;
}

function getToken() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw).token as string | undefined : undefined;
  } catch {
    return undefined;
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${resolveApiBase()}${path}`, { ...init, headers });
  } catch (error) {
    throw new ApiError("无法连接医疗服务，请确认后端已经启动。", {
      code: "NETWORK_ERROR",
      cause: error,
    });
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const detail = body.detail;
    const objectMessage = typeof detail === "object" && detail !== null && "message" in detail
      ? (detail as { message?: unknown }).message
      : null;
    const message = typeof detail === "string"
      ? detail
      : typeof objectMessage === "string"
        ? objectMessage
        : formatValidationDetails(detail) ?? "请求失败，请稍后重试。";
    throw new ApiError(message, {
      status: response.status,
      code: codeForStatus(response.status),
      details: detail,
    });
  }
  return response.json() as Promise<T>;
}

export { SESSION_KEY };
