export type OperatorRequestStatus = "pending" | "approved" | "rejected";

export type OperatorRequestRow = {
  id: string;
  ownerId: string;
  reason: string;
  status: OperatorRequestStatus;
  decidedById: string | null;
  decisionNote: string;
  decidedAt: string | null;
  createdAt: string;
};
