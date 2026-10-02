export type DataDeletionReason = "mesh_deleted" | "source_detached" | "terms_lapsed";
export type DataDeletionStatus = "pending" | "cancelled" | "done";

/** A mesh's stored readings, scheduled for deletion after the grace period. */
export type DataDeletionRow = {
  id: string;
  meshId: string;
  sourceId: string | null;
  reason: DataDeletionReason;
  requestedById: string | null;
  requestedAt: string;
  deleteAfter: string;
  /** Readings up to this time are deleted; null deletes them all. */
  dataUntil: string | null;
  status: DataDeletionStatus;
  attempts: number;
  lastError: string;
  completedAt: string | null;
};
