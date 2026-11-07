import { canManageSources } from "@mtt/contracts/authz";
import { type ReactElement } from "react";
import { RequireRole } from "@/components/require-role";
import { ArchiveView } from "./view";

export function ArchivePage(): ReactElement {
  return (
    <RequireRole allow={canManageSources}>
      <ArchiveView />
    </RequireRole>
  );
}
