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

export type SeriesQuery = {
  channel?: string;
  payloadKind?: string;
  start?: string;
  stop?: string;
  window?: string;
  agg?: string;
};
