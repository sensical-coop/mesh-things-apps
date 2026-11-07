import { canDecideOperatorRequests } from "@mtt/contracts/authz";
import { type ReactElement } from "react";
import { RequireRole } from "@/components/require-role";
import { OperatorRequestView } from "./view";

/** The page the "operator role requested" email links to. Superusers only. */
export function OperatorRequestPage(): ReactElement {
  return (
    <RequireRole allow={canDecideOperatorRequests}>
      <OperatorRequestView />
    </RequireRole>
  );
}
