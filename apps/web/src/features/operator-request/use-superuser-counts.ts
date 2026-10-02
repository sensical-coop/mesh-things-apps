import { useQuery } from "@tanstack/react-query";
import { useOwnerDirectory } from "@/features/auth/use-owner-directory";
import { isOverdue } from "@/features/data-deletion/model";
import { dataDeletionRepository } from "@/features/data-deletion/repository";
import { operatorRequestRepository } from "@/features/operator-request/repository";

/**
 * What waits on a superuser, for the header: operator requests to decide, and
 * scheduled deletions past their date. Zero for everyone else, who never fetch them.
 */
export function useSuperuserCounts(): { pendingRequests: number; overdueDeletions: number } {
  const { isSuperuser } = useOwnerDirectory();
  const requests = useQuery({
    ...operatorRequestRepository.list({ query: { status: "pending" } }),
    enabled: isSuperuser,
  });
  const deletions = useQuery({
    ...dataDeletionRepository.list({ query: { status: "pending" } }),
    enabled: isSuperuser,
  });
  const now = new Date();
  return {
    pendingRequests: requests.data?.length ?? 0,
    overdueDeletions: (deletions.data ?? []).filter((row) => isOverdue(row, now)).length,
  };
}
