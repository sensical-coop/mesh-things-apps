/** What a failed request says, read from the body the client throws (see `attachErrorStatus`). */
export type ApiError = {
  status: number | undefined;
  detail: string | undefined;
  /** DRF's `{ field: ["message", ...] }`, first message per field. */
  fields: Record<string, string>;
};

export function readApiError(error: unknown): ApiError {
  const result: ApiError = { status: undefined, detail: undefined, fields: {} };
  if (typeof error !== "object" || error === null) return result;
  for (const [key, value] of Object.entries(error)) {
    if (key === "status" && typeof value === "number") result.status = value;
    else if (key === "detail" && typeof value === "string") result.detail = value;
    else if (Array.isArray(value) && typeof value[0] === "string") result.fields[key] = value[0];
    else if (typeof value === "string") result.fields[key] = value;
  }
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

/** The part of a failure that belongs to no field, to add after a form's general message. */
export function formLevelMessage(error: unknown): string | undefined {
  const { detail, fields } = readApiError(error);
  return fields.non_field_errors ?? detail;
}
