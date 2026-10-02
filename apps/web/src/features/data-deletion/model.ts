import type { DataDeletion, OwnerProfile } from "@mtt/contracts";

export const DATA_DELETION_STATUSES = ["pending", "done", "cancelled", "all"] as const;

export type DataDeletionStatusFilter = (typeof DATA_DELETION_STATUSES)[number];

/** Mirrors the API: superusers only. */
export function canSeeDataDeletions(me: Pick<OwnerProfile, "is_superuser"> | undefined): boolean {
  return me?.is_superuser === true;
}

/**
 * Still pending past its date: the lifecycle job has tried (see `attempts` and
 * `last_error`) or hasn't run yet. Worth a superuser's look.
 */
export function isOverdue(row: Pick<DataDeletion, "status" | "delete_after">, now: Date): boolean {
  return row.status === "pending" && new Date(row.delete_after).getTime() <= now.getTime();
}
