import type { IMeasurementRepository, MeasurementType } from "@mtt/domain/measurement/Measurement";

export class MemoryMeasurements implements IMeasurementRepository {
  constructor(private readonly rows: MeasurementType[]) {}

  async list(): Promise<MeasurementType[]> {
    return this.rows;
  }
}
