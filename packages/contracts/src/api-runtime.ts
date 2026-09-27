import type { CreateClientConfig } from "./generated/client.gen";

export const DEFAULT_API_URL = "http://localhost:8787";

function apiBaseUrl(): string {
  if (typeof process !== "undefined" && process.env.VITE_API_URL) {
    return process.env.VITE_API_URL;
  }
  return DEFAULT_API_URL;
}

export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  baseUrl: apiBaseUrl(),
  credentials: "include",
});

const CSRF_COOKIE_NAME = "csrftoken";
const CSRF_HEADER_NAME = "X-CSRFToken";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS", "TRACE"]);

function readCookie(name: string): string | undefined {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1] ?? "") : undefined;
}

/** Django's CSRF middleware requires this header */
export function attachCsrfHeader(request: Request): Request {
  if (SAFE_METHODS.has(request.method)) return request;
  const token = readCookie(CSRF_COOKIE_NAME);
  if (!token) return request;
  request.headers.set(CSRF_HEADER_NAME, token);
  return request;
}

/** The generated client throws the parsed error body but drops the HTTP status; put it back on. */
export function attachErrorStatus(error: unknown, response?: Response): unknown {
  const status = response?.status;
  // DRF answers some refusals with a bare list of messages: those belong to no field.
  if (Array.isArray(error)) return { non_field_errors: error, status };
  if (typeof error === "object" && error !== null) {
    return status === undefined ? error : { ...error, status };
  }
  return { detail: typeof error === "string" ? error : "Request failed", status };
}
