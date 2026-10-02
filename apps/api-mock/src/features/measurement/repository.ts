import type { IMeasurementRepository, MeasurementType } from "@mtt/domain/measurement/Measurement";

export class MemoryMeasurements implements IMeasurementRepository {
  constructor(private readonly rows: MeasurementType[]) {}

  async list(): Promise<MeasurementType[]> {
    return this.rows;
  }

  /** The catalog row for a channel, created on first use as the registry does for derived fields. */
  ensure(type: Omit<MeasurementType, "id" | "createdAt" | "updatedAt">, now: string, id: string): MeasurementType {
    const existing = this.rows.find((row) => row.channel === type.channel);
    if (existing) return existing;
    const created = { ...type, id, createdAt: now, updatedAt: now };
    this.rows.push(created);
    return created;
  }
}
