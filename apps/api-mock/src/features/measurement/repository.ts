import type { MeasurementType } from "@mtt/domain/measurement/Measurement";

/** The catalog row for a channel, created on first use as the registry does for derived fields. */
export function ensureMeasurement(
  rows: MeasurementType[],
  type: Omit<MeasurementType, "id" | "createdAt" | "updatedAt">,
  now: string,
  id: string,
): MeasurementType {
  const existing = rows.find((row) => row.channel === type.channel);
  if (existing) return existing;
  const created = { ...type, id, createdAt: now, updatedAt: now };
  rows.push(created);
  return created;
}
