import type { OperatorRequestStatusEnum } from "@mtt/contracts";
import type { Actor } from "../../auth";
import type { Device } from "@mtt/domain/device/Device";
import type { Mesh } from "@mtt/domain/mesh/Mesh";
import { newId, nowIso } from "@mtt/domain/shared/ids";
import type { Store } from "../../store";

export type OperatorRequestRow = {
  id: string;
  ownerId: string;
  reason: string;
  status: OperatorRequestStatusEnum;
  decidedById: string | null;
  decisionNote: string;
  decidedAt: string | null;
  createdAt: string;
};

export function latestOperatorRequest(rows: readonly OperatorRequestRow[], ownerId: string): OperatorRequestRow | undefined {
  return rows.filter((row) => row.ownerId === ownerId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

export function createOperatorRequest(
  rows: OperatorRequestRow[],
  ownerId: string,
  reason: string,
): { row: OperatorRequestRow } | { blank: true } | { pending: true } {
  const trimmed = reason.trim();
  if (!trimmed) return { blank: true };
  if (rows.some((row) => row.ownerId === ownerId && row.status === "pending")) return { pending: true };
  const row: OperatorRequestRow = {
    id: newId(),
    ownerId,
    reason: trimmed,
    status: "pending",
    decidedById: null,
    decisionNote: "",
    decidedAt: null,
    createdAt: nowIso(),
  };
  rows.push(row);
  return { row };
}

export function listOperatorRequests(rows: readonly OperatorRequestRow[], status: string): OperatorRequestRow[] {
  return rows.filter((row) => status === "all" || row.status === status).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function findOperatorRequest(rows: readonly OperatorRequestRow[], id: string): OperatorRequestRow | undefined {
  return rows.find((candidate) => candidate.id === id);
}

export async function decideOperatorRequest(
  db: Store,
  actor: Actor,
  row: OperatorRequestRow,
  decision: "approve" | "reject",
  note: string | undefined,
  syncArchive: (device: Device, mesh: Mesh) => void,
): Promise<{ already: OperatorRequestStatusEnum } | { row: OperatorRequestRow }> {
  if (row.status !== "pending") return { already: row.status };
  const approve = decision === "approve";
  row.status = approve ? "approved" : "rejected";
  row.decisionNote = note ?? "";
  row.decidedById = actor.id;
  row.decidedAt = nowIso();
  const requester = db.actors.get(row.ownerId);
  if (approve && requester?.role === "owner") {
    requester.role = "operator";
    // Archives the owner switched on before are archived again.
    for (const mesh of await db.meshes.list()) {
      if (mesh.ownerId !== requester.id) continue;
      for (const device of await db.devices.list({ meshId: mesh.id })) syncArchive(device, mesh);
    }
  }
  console.info(`[mock] operator request ${row.status} for ${requester?.email ?? row.ownerId}`);
  return { row };
}
