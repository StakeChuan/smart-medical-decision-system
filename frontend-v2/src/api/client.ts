const SESSION_KEY = "smart-medical-v2-session";

function resolveApiBase() {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  if (!window.location.hostname || window.location.protocol === "file:") return "http://127.0.0.1:8000";
  if (["127.0.0.1", "localhost"].includes(window.location.hostname)) return "http://127.0.0.1:8000";
  return `${window.location.protocol}//${window.location.hostname}:8000`;
}

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
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
  } catch {
    throw new ApiError("无法连接医疗服务，请确认后端已经启动。", 0);
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const detail = body.detail;
    const message = typeof detail === "string" ? detail : detail?.message || "请求失败，请稍后重试。";
    throw new ApiError(message, response.status);
  }
  return response.json() as Promise<T>;
}

export { SESSION_KEY };
