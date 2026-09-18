import type { DeviceRead, Mesh } from "@mtt/contracts";
import { Temporal } from "temporal-polyfill";

/** True when last_seen is older than three publish intervals. */
function isSilent(
  lastSeen: string | null,
  publishIntervalSeconds: number | null,
  nowMs = Date.now(),
  missed = 3,
): boolean {
  if (!lastSeen) return true;
  const intervalMs = (publishIntervalSeconds && publishIntervalSeconds > 0 ? publishIntervalSeconds : 300) * 1000;
  const seen = Date.parse(lastSeen);
  if (!Number.isFinite(seen)) return true;
  return seen + missed * intervalMs < nowMs;
}

export function meshTitle(mesh: Pick<Mesh, "channel_id" | "label">): string {
  return mesh.label?.trim() || mesh.channel_id;
}

export function deviceTitle(device: DeviceRead): string {
  return device.name?.trim() || device.label?.trim() || `Node ${device.node_id}`;
}

/** Meshtastic role, else gateway/node. Sentence case so it can sit in a badge. */
export function deviceRoleLabel(device: Pick<DeviceRead, "role" | "is_gateway">): string {
  const role = device.role?.trim();
  if (!role) return device.is_gateway ? "Gateway" : "Node";
  const words = role.replaceAll("_", " ").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function toZoned(iso: string): Temporal.ZonedDateTime | null {
  const timeZone = Temporal.Now.timeZoneId();
  try {
    return Temporal.Instant.from(iso).toZonedDateTimeISO(timeZone);
  } catch {
    try {
      return Temporal.PlainDateTime.from(iso).toZonedDateTime(timeZone);
    } catch {
      return null;
    }
  }
}

const whenOpts: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" };
const clockOpts: Intl.DateTimeFormatOptions = { timeStyle: "short" };

export function formatWhen(iso: string | null): string {
  if (!iso) return "Never seen";
  return toZoned(iso)?.toLocaleString(undefined, whenOpts) ?? iso;
}

const relativeUnits = ["year", "month", "week", "day", "hour", "minute", "second"] as const;

/** Temporal has no toRelative; Instant.until + RelativeTimeFormat is the MDN path. */
export function toRelative(iso: string): string | null {
  const zoned = toZoned(iso);
  if (!zoned) return null;
  const now = Temporal.Now.zonedDateTimeISO(zoned.timeZoneId);
  const duration = zoned.until(now, { largestUnit: "year", smallestUnit: "second" });
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const parts = {
    year: duration.years,
    month: duration.months,
    week: duration.weeks,
    day: duration.days,
    hour: duration.hours,
    minute: duration.minutes,
    second: duration.seconds,
  };
  for (const unit of relativeUnits) {
    const n = parts[unit];
    if (n !== 0) return rtf.format(-n, unit);
  }
  return rtf.format(0, "second");
}

export function formatLastSeen(iso: string | null): string {
  if (!iso) return "Never seen";
  const abs = formatWhen(iso);
  const rel = toRelative(iso);
  return rel ? `${abs} (${rel})` : abs;
}

export function formatClock(iso: string): string {
  return toZoned(iso)?.toLocaleString(undefined, clockOpts) ?? iso;
}

export function formatValue(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value == null) return "—";
  return String(value);
}

export function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value !== "" && Number.isFinite(Number(value))) return Number(value);
  return null;
}

export function formatRatio(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString(undefined, { style: "percent", maximumFractionDigits: 0 });
}

/** Seconds as hours, minutes, seconds. Empty or invalid → em dash. */
export function formatSecondsAsHms(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return "—";
  const total = Math.trunc(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const parts: string[] = [];
  if (h) parts.push(`${h} h`);
  if (m) parts.push(`${m} min`);
  if (s || parts.length === 0) parts.push(`${s} s`);
  return parts.join(" ");
}

export function deviceSilent(device: Pick<DeviceRead, "last_seen" | "publish_interval_seconds">): boolean {
  return isSilent(device.last_seen, device.publish_interval_seconds);
}

export function triBool(value: string | null): boolean | undefined {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}
