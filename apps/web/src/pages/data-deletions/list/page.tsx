import { canSeeDataDeletions } from "@mtt/contracts/authz";
import { type ReactElement } from "react";
import { RequireRole } from "@/components/require-role";
import { DataDeletionsView } from "./view";

export function DataDeletionsPage(): ReactElement {
  return (
    <RequireRole allow={canSeeDataDeletions}>
      <DataDeletionsView />
    </RequireRole>
  );
}
