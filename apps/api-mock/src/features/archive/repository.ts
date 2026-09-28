/**
 * The Parquet archive as readings serves it: one object per mesh and UTC hour, written
 * only for devices whose archive is on (meshtastic-things `readings/archive.py`).
 * The mock keeps when each device was on, and lists an hour as archived if any device
 * of the mesh was on during it; the files hold no rows.
 */

/** Mirrors READINGS__ARCHIVE_BUCKET: off, as on lite, every archive route answers 404. */
export const ARCHIVE_ENABLED = process.env.MOCK_ARCHIVE !== "false";
/** Mirrors READINGS__ARCHIVE_STS: off, a provider without STS, the credentials route answers 404. */
export const ARCHIVE_ISSUES_CREDENTIALS = ARCHIVE_ENABLED && process.env.MOCK_ARCHIVE_STS !== "false";

export const ARCHIVE_BUCKET = "meshtastic-telemetry";
export const ARCHIVE_PREFIX = "telemetry";
/** READINGS__ARCHIVE_PUBLIC_ENDPOINT_URL as the dev overlay publishes MinIO. */
export const ARCHIVE_PUBLIC_ENDPOINT = "http://localhost:9000";
export const ARCHIVE_REGION = "us-east-1";
export const ARCHIVE_CREDENTIAL_TTL_S = 3600;

const HOUR_MS = 3_600_000;
/** Enough history to page through, without listing years of hours. */
const MAX_HOURS = 60 * 24;

export type ArchiveSpan = { meshId: string; nodeId: number; from: string; to: string | null };

export type ArchivePartition = { dt: string; hour: number; size: number; last_modified: string };

export function meshPrefix(meshId: string): string {
  return `${ARCHIVE_PREFIX}/mesh_id=${meshId}/`;
}

export function partitionKey(meshId: string, day: string, hour: number): string {
  return `${meshPrefix(meshId)}dt=${day}/hour=${String(hour).padStart(2, "0")}/data.parquet`;
}

export class MemoryArchive {
  readonly spans: ArchiveSpan[] = [];

  start(meshId: string, nodeId: number, at: string): void {
    if (this.spans.some((s) => s.meshId === meshId && s.nodeId === nodeId && s.to === null)) return;
    this.spans.push({ meshId, nodeId, from: at, to: null });
  }

  /** Stops new hours; what was stored stays until the mesh's data is deleted. */
  stop(meshId: string, nodeId: number, at: string): void {
    for (const span of this.spans) {
      if (span.meshId === meshId && span.nodeId === nodeId && span.to === null) span.to = at;
    }
  }

  /** Every hour with data for the mesh within [start, stop] (days, inclusive), oldest first. */
  partitions(meshId: string, start?: string, stop?: string, now = Date.now()): ArchivePartition[] {
    const spans = this.spans.map((s) => ({
      from: Date.parse(s.from),
      to: s.to === null ? now : Date.parse(s.to),
      meshId: s.meshId,
    })).filter((s) => s.meshId === meshId && s.to > s.from);
    if (!spans.length) return [];
    const first = Math.max(Math.floor(Math.min(...spans.map((s) => s.from)) / HOUR_MS), Math.floor(now / HOUR_MS) - MAX_HOURS);
    const out: ArchivePartition[] = [];
    for (let h = first; h * HOUR_MS <= now; h++) {
      const begin = h * HOUR_MS;
      const devices = spans.filter((s) => s.from < begin + HOUR_MS && s.to > begin).length;
      if (!devices) continue;
      const iso = new Date(begin).toISOString();
      const dt = iso.slice(0, 10);
      if ((start && dt < start) || (stop && dt > stop)) continue;
      out.push({
        dt,
        hour: new Date(begin).getUTCHours(),
        // A few KiB per device and hour, as measured upstream; varied so the table isn't flat.
        size: 1800 * devices + ((h * 37) % 600),
        // The writer rewrites the current hour's object every flush.
        last_modified: new Date(Math.min(begin + HOUR_MS - 60_000, now)).toISOString(),
      });
    }
    return out;
  }
}
