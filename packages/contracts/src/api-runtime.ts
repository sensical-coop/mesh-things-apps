import type { ZodType } from "zod";

let baseUrl = "";

/** Where requests go: web sets it from VITE_API_URL before the first request. */
export function setApiBaseUrl(url: string): void {
  baseUrl = url;
}

const CSRF_COOKIE_NAME = "csrftoken";
const CSRF_HEADER_NAME = "X-CSRFToken";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS", "TRACE"]);

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1] ?? "") : undefined;
}

/** What a failed request throws: DRF's body with the HTTP status put on it. */
export function toApiError(body: unknown, status: number | undefined): unknown {
  // DRF answers some refusals with a bare list of messages: those belong to no field.
  if (Array.isArray(body)) return { non_field_errors: body, status };
  if (typeof body === "object" && body !== null) return { ...body, status };
  return { detail: typeof body === "string" && body ? body : "Request failed", status };
}

/**
 * The error type Orval gives queries and mutations: TanStack's default, as before. At runtime it is
 * `toApiError`'s object, a network `TypeError` or a `ZodError`; read it with web's `readApiError`.
 */
export type ErrorType<_Body> = Error;

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  if (!response.headers.get("content-type")?.includes("json")) return text;
  return JSON.parse(text);
}

/**
 * Orval's request function for every operation: base URL, session cookie, Django's CSRF
 * header, the generated Zod parse of the response, and DRF errors thrown with their status.
 */
export async function apiFetch<T>(url: string, options: RequestInit & { schema?: ZodType }): Promise<T> {
  const { schema, ...init } = options;
  const headers = new Headers(init.headers);
  const method = (init.method ?? "GET").toUpperCase();
  if (!SAFE_METHODS.has(method)) {
    const token = readCookie(CSRF_COOKIE_NAME);
    if (token) headers.set(CSRF_HEADER_NAME, token);
  }
  const response = await fetch(`${baseUrl}${url}`, { ...init, headers, credentials: "include" });
  const body = await readBody(response);
  if (!response.ok) throw toApiError(body, response.status);
  // Orval types each operation's T from the same spec the schema comes from.
  return (schema ? schema.parse(body) : body) as T;
}
