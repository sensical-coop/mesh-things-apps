import { canDecideOperatorRequests } from "@mtt/contracts/authz";
import { type ReactElement } from "react";
import { RequireRole } from "@/components/require-role";
import { OperatorRequestsView } from "./view";

export function OperatorRequestsPage(): ReactElement {
  return (
    <RequireRole allow={canDecideOperatorRequests}>
      <OperatorRequestsView />
    </RequireRole>
  );
}
