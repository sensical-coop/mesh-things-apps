/** What a failed request says, read from the body the client throws (see `toApiError`). */
export type ApiError = {
  status: number | undefined;
  detail: string | undefined;
  /** Seconds until a throttled (429) request may be retried, when the API says so. */
  retryAfter: number | undefined;
  /** DRF's `{ field: ["message", ...] }`, first message per field. */
  fields: Record<string, string>;
};

// DRF's throttle body is English: "Request was throttled. Expected available in N seconds."
const THROTTLE_SECONDS_PATTERN = /available in (\d+) seconds?/i;

export function readApiError(error: unknown): ApiError {
  const result: ApiError = { status: undefined, detail: undefined, retryAfter: undefined, fields: {} };
  if (typeof error !== "object" || error === null) return result;
  for (const [key, value] of Object.entries(error)) {
    if (key === "status" && typeof value === "number") result.status = value;
    else if (key === "detail" && typeof value === "string") result.detail = value;
    else if (Array.isArray(value) && typeof value[0] === "string") result.fields[key] = value[0];
    else if (typeof value === "string") result.fields[key] = value;
  }
  const seconds = Number(THROTTLE_SECONDS_PATTERN.exec(result.detail ?? "")?.[1]);
  if (result.status === 429 && seconds > 0) result.retryAfter = seconds;
  return result;
}

/** Zod issues keyed by their last path segment, first message per field. */
export function issueErrors(issues: readonly { path: readonly PropertyKey[]; message: string }[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path.at(-1) ?? "form");
    errors[key] ??= issue.message;
  }
  return errors;
}

export type SignupFailure =
  | { kind: "throttled"; retryAfter: number | undefined }
  | { kind: "duplicateEmail" }
  | { kind: "field"; message: string }
  | { kind: "generic" };

const SIGNUP_FIELDS = ["password", "email", "name", "terms_version"] as const;

// DRF's unique-email 400 is `{ email: ["… already exists."] }`. Some responses use 409 instead.
const EMAIL_EXISTS = /exist/i;

export type LoginFailure = { kind: "unauthorized" } | { kind: "throttled" } | { kind: "generic" };

/** Login failure from the status the API answered with: 401, 429, or anything else. */
export function classifyLoginFailure(error: unknown): LoginFailure {
  const { status } = readApiError(error);
  if (status === 401) return { kind: "unauthorized" };
  if (status === 429) return { kind: "throttled" };
  return { kind: "generic" };
}

/** Signup failure, in the order the forms show it: throttle, then a taken email, then field text. */
export function classifySignupFailure(error: unknown): SignupFailure {
  const { status, retryAfter, fields } = readApiError(error);
  if (status === 429) return { kind: "throttled", retryAfter };
  const email = fields.email;
  if (status === 409 || (email !== undefined && EMAIL_EXISTS.test(email))) return { kind: "duplicateEmail" };
  const message = SIGNUP_FIELDS.map((key) => fields[key])
    .filter((value) => value !== undefined)
    .join(" ");
  if (message) return { kind: "field", message };
  return { kind: "generic" };
}

/** The part of a failure that belongs to no field, to add after a form's general message. */
export function formLevelMessage(error: unknown): string | undefined {
  const { detail, fields } = readApiError(error);
  return fields.non_field_errors ?? detail;
}

/** Every message in an error body, however DRF nested it (`{steps: [{function_name: [...]}]}`, or a bare list). */
export function errorMessages(error: unknown): string[] {
  if (typeof error === "string") return [error];
  if (Array.isArray(error)) return error.flatMap(errorMessages);
  if (typeof error !== "object" || error === null) return [];
  return Object.entries(error).flatMap(([key, value]) => (key === "status" ? [] : errorMessages(value)));
}
