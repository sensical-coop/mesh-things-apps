import { readApiError } from "@mtt/contracts/errors";

/**
 * POST /readings/meshes/{id}/exports when the instance has no bucket is
 * `NotFound("Not found")`. A mesh the caller cannot export is "Mesh not found";
 * an empty Parquet range is "Nothing archived in that range". DRF puts no code on the body.
 */
export function isExportStorageMissing(error: unknown): boolean {
  const { status, detail } = readApiError(error);
  return status === 404 && detail === "Not found";
}
