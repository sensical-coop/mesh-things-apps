import { canOperate } from "@mtt/contracts/authz";
import { type ReactElement } from "react";
import { RequireRole } from "@/features/auth/require-role";
import { SourcesView } from "./view";

export function SourcesPage(): ReactElement {
  return (
    <RequireRole allow={canOperate}>
      <SourcesView />
    </RequireRole>
  );
}
