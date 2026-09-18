export type MeasurementType = {
  id: string;
  payloadKind: string;
  fieldName: string;
  channel: string;
  origin: string;
  displayName: string | null;
  description: string | null;
  nativeUnit: string | null;
  quantityKind: string | null;
  vocabularyUri: string | null;
  createdAt: string;
  updatedAt: string;
};

export interface IMeasurementRepository {
  list(): Promise<MeasurementType[]>;
}
