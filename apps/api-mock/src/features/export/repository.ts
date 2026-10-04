/**
 * Exports as readings serves them (meshtastic-things `readings/exports.py`): a job per
 * request, built in the background into one zip, downloadable for a day and listed for
 * 30. The mock has no worker: a job's status follows from the time since it was asked
 * for, so the console's polling sees it queue, run and finish.
 */
import { newId } from "@mtt/domain/shared/ids";

export type ExportFormat = "csv" | "parquet";
export type ExportStatus = "queued" | "running" | "ready" | "failed" | "expired";

/** Mirrors READINGS__EXPORT_MAX_DAYS. */
export const EXPORT_MAX_DAYS = 366;
const FILE_TTL_MS = 24 * 3_600_000;
const HISTORY_MS = 30 * 24 * 3_600_000;
const QUEUED_MS = 1_500;
const DAY_MS = 86_400_000;

export type ExportRow = {
  id: string;
  ownerId: string;
  meshId: string;
  format: ExportFormat;
  start: string;
  stop: string;
  nodeIds: number[] | null;
  createdAt: number;
  /** What the build ends in; set when asked for, revealed once it would have finished. */
  error: string | null;
  size: number;
};

export function daysBetween(start: string, stop: string): number {
  return Math.round((Date.parse(`${stop}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / DAY_MS) + 1;
}

function runMs(row: ExportRow): number {
  return Math.min(8_000, Math.max(2_000, daysBetween(row.start, row.stop) * 400));
}

export function finishedAt(row: ExportRow): number {
  return row.createdAt + QUEUED_MS + runMs(row);
}

export function statusOf(row: ExportRow, now = Date.now()): ExportStatus {
  if (now < row.createdAt + QUEUED_MS) return "queued";
  if (now < finishedAt(row)) return "running";
  if (row.error) return "failed";
  return now < finishedAt(row) + FILE_TTL_MS ? "ready" : "expired";
}

export function daysDone(row: ExportRow, now = Date.now()): number {
  const total = daysBetween(row.start, row.stop);
  const status = statusOf(row, now);
  if (status === "queued") return 0;
  if (status !== "running") return total;
  return Math.floor(((now - row.createdAt - QUEUED_MS) / runMs(row)) * total);
}

export function expiresAt(row: ExportRow): number {
  return statusOf(row) === "queued" || statusOf(row) === "running" ? row.createdAt + FILE_TTL_MS : finishedAt(row) + FILE_TTL_MS;
}

export function exportFilename(row: ExportRow): string {
  const days = row.start === row.stop ? row.start : `${row.start}_${row.stop}`;
  return `mesh-${row.meshId.slice(0, 8)}_${days}_${row.format}.zip`;
}

export class MemoryExports {
  readonly rows: ExportRow[] = [];

  /** The owner's exports of the last 30 days, newest first. */
  listFor(ownerId: string, meshId?: string, now = Date.now()): ExportRow[] {
    return this.rows
      .filter((r) => r.ownerId === ownerId && now - r.createdAt < HISTORY_MS && (!meshId || r.meshId === meshId))
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  get(id: string): ExportRow | undefined {
    return this.rows.find((r) => r.id === id);
  }

  /** The owner's one export queued or running, if any. */
  active(ownerId: string): ExportRow | undefined {
    return this.rows.find((r) => r.ownerId === ownerId && ["queued", "running"].includes(statusOf(r)));
  }

  add(row: Omit<ExportRow, "id">): ExportRow {
    const created = { ...row, id: newId() };
    this.rows.push(created);
    return created;
  }
}
