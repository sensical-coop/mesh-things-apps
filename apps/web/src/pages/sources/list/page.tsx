import { canManageSources } from "@mtt/contracts/authz";
import { type ReactElement } from "react";
import { RequireRole } from "@/components/require-role";
import { SourcesView } from "./view";

export function SourcesPage(): ReactElement {
  return (
    <RequireRole allow={canManageSources}>
      <SourcesView />
    </RequireRole>
  );
}
