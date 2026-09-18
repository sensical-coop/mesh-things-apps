import type { IDeviceRepository } from "@mtt/domain/device/IDeviceRepository";
import type { MeasurementType } from "@mtt/domain/measurement/Measurement";
import type { IReadingsRepository, LatestReading, SeriesQuery } from "@mtt/domain/readings/Readings";

export class MemoryReadings implements IReadingsRepository {
  constructor(
    private readonly devices: IDeviceRepository,
    private readonly measurements: MeasurementType[],
    private readonly latestDeviceUuids: ReadonlySet<string>,
    private readonly originIso: string,
  ) {}

  async latest(deviceUuid: string): Promise<LatestReading[]> {
    const device = await this.devices.get(deviceUuid);
    if (!device) return [];
    if (!this.latestDeviceUuids.has(device.uuid)) return [];
    return this.measurements.map((m, i) => ({
      payloadKind: m.payloadKind,
      fieldName: m.fieldName,
      channel: m.channel,
      value: i === 0 ? 21.4 : i === 1 ? 8.1 : 0.91,
      time: this.originIso,
      unit: m.nativeUnit,
      quantityKind: m.quantityKind,
      vocabularyUri: m.vocabularyUri,
      origin: m.origin,
    }));
  }

  async series(deviceUuid: string, query: SeriesQuery) {
    const device = await this.devices.get(deviceUuid);
    if (!device) {
      return { payloadKind: query.payloadKind ?? "environmentmetrics", series: [] };
    }
    const temp = this.measurements[0];
    const channel = query.channel ?? temp?.channel ?? "environmentmetrics.temperature";
    const payloadKind = query.payloadKind ?? channel.split(".")[0] ?? "environmentmetrics";
    const points = Array.from({ length: 24 }, (_, i) => ({
      time: new Date(Date.parse(this.originIso) + i * 3600_000).toISOString(),
      value: 18 + Math.sin(i / 3) * 3,
    }));
    return { payloadKind, series: [{ channel, points }] };
  }
}
