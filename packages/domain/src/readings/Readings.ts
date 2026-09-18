export type LatestReading = {
  payloadKind: string;
  fieldName: string;
  channel: string;
  value: number | null;
  time: string;
  unit: string | null;
  quantityKind: string | null;
  vocabularyUri: string | null;
  origin: string;
};

export type SeriesPoint = { time: string; value: number | null };

export type SeriesQuery = {
  channel?: string;
  payloadKind?: string;
  start?: string;
  stop?: string;
  window?: string;
  agg?: string;
};

export interface IReadingsRepository {
  latest(deviceUuid: string): Promise<LatestReading[]>;
  series(
    deviceUuid: string,
    query: SeriesQuery,
  ): Promise<{ payloadKind: string; series: { channel: string; points: SeriesPoint[] }[] }>;
}
