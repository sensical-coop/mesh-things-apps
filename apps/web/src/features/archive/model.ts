import type { ArchiveCredentials, ArchivePartition, DeviceRead, OwnerProfile } from "@mtt/contracts";

/**
 * Mirrors the API: the archive of a mesh is read by its owner while an operator, and by
 * superusers; devices are archived only there. Unknown while `me` loads.
 */
export function canUseArchive(
  me: Pick<OwnerProfile, "id" | "is_superuser" | "role"> | undefined,
  meshOwnerId: string | undefined,
): boolean {
  if (!me || !meshOwnerId) return false;
  return me.is_superuser === true || (me.role === "operator" && meshOwnerId === me.id);
}

/**
 * Whether the archive setting can be changed from here: the API sends it only to the
 * mesh's owner and superusers, and accepts it only on an operator's mesh.
 */
export function canArchiveDevice(
  device: Pick<DeviceRead, "archive_enabled">,
  me: Pick<OwnerProfile, "id" | "is_superuser" | "role"> | undefined,
  meshOwnerId: string | undefined,
): boolean {
  return device.archive_enabled !== undefined && canUseArchive(me, meshOwnerId);
}

export type MeshArchiveState = {
  /** Devices whose setting the API sent, so it can be changed from here. */
  devices: number;
  archived: number;
};

/** How many of a mesh's devices are stored, out of those whose setting is known. */
export function meshArchiveState(devices: readonly Pick<DeviceRead, "archive_enabled">[]): MeshArchiveState {
  const known = devices.filter((device) => device.archive_enabled !== undefined);
  return { devices: known.length, archived: known.filter((device) => device.archive_enabled === true).length };
}

/** The devices a mesh-wide switch has to change to leave every one of them `enabled`. */
export function devicesToSwitch<T extends Pick<DeviceRead, "archive_enabled">>(devices: readonly T[], enabled: boolean): T[] {
  return devices.filter((device) => device.archive_enabled !== undefined && device.archive_enabled !== enabled);
}

export type ArchiveSummary = {
  files: number;
  bytes: number;
  /** Oldest and newest hour, as `YYYY-MM-DD HH:00` UTC; null while empty. */
  first: string | null;
  last: string | null;
};

export function partitionLabel(partition: Pick<ArchivePartition, "dt" | "hour">): string {
  return `${partition.dt} ${String(partition.hour).padStart(2, "0")}:00`;
}

/** The manifest lists partitions oldest first. */
export function summarizeArchive(partitions: readonly ArchivePartition[]): ArchiveSummary {
  const first = partitions[0];
  const last = partitions.at(-1);
  return {
    files: partitions.length,
    bytes: partitions.reduce((sum, p) => sum + p.size, 0),
    first: first ? partitionLabel(first) : null,
    last: last ? partitionLabel(last) : null,
  };
}

/** Where one hour downloads from: a redirect to a temporary link, followed by the browser. */
export function partitionDownloadUrl(apiUrl: string, meshId: string, partition: Pick<ArchivePartition, "dt" | "hour">): string {
  return `${apiUrl.replace(/\/+$/, "")}/readings/archive/meshes/${meshId}/partitions/${partition.dt}/${partition.hour}`;
}

const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB"] as const;

export function formatBytes(bytes: number, locale?: string): string {
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < BYTE_UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = unit === 0 || value >= 10 ? 0 : 1;
  return `${value.toLocaleString(locale, { maximumFractionDigits: digits })} ${BYTE_UNITS[unit]}`;
}

function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function shellString(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

export type ArchiveDay = {
  dt: string;
  /** Oldest hour first. */
  hours: ArchivePartition[];
  bytes: number;
  lastModified: string;
};

/** Hours grouped by UTC day, newest day first. The manifest lists them oldest first. */
export function groupByDay(partitions: readonly ArchivePartition[]): ArchiveDay[] {
  const days = new Map<string, ArchiveDay>();
  for (const partition of partitions) {
    const day = days.get(partition.dt) ?? { dt: partition.dt, hours: [], bytes: 0, lastModified: partition.last_modified };
    day.hours.push(partition);
    day.bytes += partition.size;
    if (partition.last_modified > day.lastModified) day.lastModified = partition.last_modified;
    days.set(partition.dt, day);
  }
  return [...days.values()].sort((a, b) => b.dt.localeCompare(a.dt));
}

/** The S3 settings DuckDB needs, from what the credentials route returns. */
function duckdbSecret(credentials: ArchiveCredentials | null): string {
  const lines = [
    "TYPE s3",
    `KEY_ID ${sqlString(credentials?.access_key_id ?? "<access_key_id>")}`,
    `SECRET ${sqlString(credentials?.secret_access_key ?? "<secret_access_key>")}`,
    `SESSION_TOKEN ${sqlString(credentials?.session_token ?? "<session_token>")}`,
    `REGION ${sqlString(credentials?.region ?? "<region>")}`,
  ];
  // Null on AWS, where DuckDB finds the endpoint itself; anything else is path-style.
  if (credentials === null || credentials.endpoint) {
    const endpoint = credentials?.endpoint ?? "<endpoint>";
    const host = endpoint.replace(/^https?:\/\//, "").replace(/\/+$/, "");
    lines.push(`ENDPOINT ${sqlString(host)}`, "URL_STYLE 'path'");
    if (endpoint.startsWith("http://")) lines.push("USE_SSL false");
  }
  return lines.join(",\n  ");
}

function s3Root(credentials: ArchiveCredentials | null, prefix: string): string {
  return (credentials?.s3_path ?? `s3://<bucket>/${prefix}`).replace(/\/?$/, "/");
}

function duckdbSource(credentials: ArchiveCredentials | null): string[] {
  return ["INSTALL httpfs; LOAD httpfs;", `CREATE SECRET archive (\n  ${duckdbSecret(credentials)}\n);`];
}

function readParquet(credentials: ArchiveCredentials | null, prefix: string): string {
  return `read_parquet(${sqlString(`${s3Root(credentials, prefix)}dt=*/hour=*/data.parquet`)}, hive_partitioning = true)`;
}

/**
 * A DuckDB session that reads the mesh's archive as one partitioned dataset. With no
 * credentials yet, placeholders stand where they go.
 */
export function duckdbCommand(credentials: ArchiveCredentials | null, prefix: string): string {
  return [
    ...duckdbSource(credentials),
    "SELECT node_id, payload_kind, dt, hour, count(*) AS readings",
    `FROM ${readParquet(credentials, prefix)}`,
    "GROUP BY ALL ORDER BY dt, hour;",
  ].join("\n");
}

/** Every hour of the archive into one local Parquet file, keeping `dt` and `hour` as columns. */
export function duckdbExportCommand(credentials: ArchiveCredentials | null, prefix: string, fileName: string): string {
  return [
    ...duckdbSource(credentials),
    `COPY (SELECT * FROM ${readParquet(credentials, prefix)} ORDER BY dt, hour)`,
    `TO ${sqlString(fileName)} (FORMAT parquet);`,
  ].join("\n");
}

/** Every hourly file as stored, with the same `dt=/hour=` folders; run again, it fetches only what changed. */
export function awsCliCommand(credentials: ArchiveCredentials | null, prefix: string, folder: string): string {
  const env = [
    `AWS_ACCESS_KEY_ID=${shellString(credentials?.access_key_id ?? "<access_key_id>")}`,
    `AWS_SECRET_ACCESS_KEY=${shellString(credentials?.secret_access_key ?? "<secret_access_key>")}`,
    `AWS_SESSION_TOKEN=${shellString(credentials?.session_token ?? "<session_token>")}`,
    `AWS_DEFAULT_REGION=${shellString(credentials?.region ?? "<region>")}`,
  ];
  const endpoint = credentials === null ? "<endpoint>" : credentials.endpoint;
  const copy = `aws s3 sync ${shellString(s3Root(credentials, prefix))} ${shellString(folder)}`;
  return [
    `export ${env.join(" \\\n  ")}`,
    endpoint ? `${copy} \\\n  --endpoint-url ${shellString(endpoint)}` : copy,
  ].join("\n");
}

/** A mesh's title as a file or folder name for the commands: `Barcelona Mesh!` → `barcelona-mesh`. */
export function meshSlug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "mesh";
}
