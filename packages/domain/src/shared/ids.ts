export function newId(): string {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** Stands in for a uuid the API always sends but the mock has nothing for. */
export const NIL_UUID = "00000000-0000-4000-8000-000000000000";
