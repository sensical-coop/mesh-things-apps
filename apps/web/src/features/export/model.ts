import type { Export, ExportRequest } from "@mtt/contracts";
import { EXPORT_MAX_DAYS } from "@mtt/contracts/export";

const DAY_MS = 86_400_000;

/** Today in UTC, as `YYYY-MM-DD`: export days are UTC days. */
export function utcToday(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function shiftDay(day: string, days: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Days from `start` to `stop`, both included. */
export function daysInRange(start: string, stop: string): number {
  return Math.round((Date.parse(`${stop}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / DAY_MS) + 1;
}

/** The last `days` days up to today, the default a form opens with. */
export function lastDays(days: number, now = new Date()): { start: string; stop: string } {
  const stop = utcToday(now);
  return { start: shiftDay(stop, -(days - 1)), stop };
}

export type RangeProblem = "missing" | "reversed" | "tooLong";

/** What each status means for the screens; a `Record` keeps it exhaustive with the API's statuses. */
const STATUS: Record<Export["status"], { active: boolean; retryable: boolean }> = {
  queued: { active: true, retryable: false },
  running: { active: true, retryable: false },
  ready: { active: false, retryable: false },
  failed: { active: false, retryable: true },
  expired: { active: false, retryable: true },
};

/** What is wrong with a range before asking the API, or null. */
export function rangeProblem(start: string, stop: string): RangeProblem | null {
  if (!start || !stop) return "missing";
  if (stop < start) return "reversed";
  if (daysInRange(start, stop) > EXPORT_MAX_DAYS) return "tooLong";
  return null;
}

/** Still being built: the list keeps polling. */
export function isActive(status: Export["status"]): boolean {
  return STATUS[status].active;
}

/** A past download that can be asked for again. */
export function canRequestAgain(status: Export["status"]): boolean {
  return STATUS[status].retryable;
}

/** The request that built an export, to ask for it again or for another range of it. */
export function requestOf(row: Pick<Export, "format" | "start" | "stop" | "node_ids">): ExportRequest {
  const body: ExportRequest = { format: row.format, start: row.start, stop: row.stop };
  if (row.node_ids?.length) body.node_ids = [...row.node_ids];
  return body;
}

/** Poll every few seconds while anything is building; stop once nothing is. */
export function pollInterval(rows: readonly Pick<Export, "status">[] | undefined): number | false {
  return rows?.some((row) => isActive(row.status)) ? 3000 : false;
}

/** 0 to 1, for the progress bar of a running export. */
export function progressOf(row: Pick<Export, "days_done" | "days_total">): number {
  return row.days_total ? Math.min(1, row.days_done / row.days_total) : 0;
}
