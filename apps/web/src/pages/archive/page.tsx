import { canOperate } from "@mtt/contracts/authz";
import { type ReactElement } from "react";
import { RequireRole } from "@/features/auth/require-role";
import { ArchiveView } from "./view";

export function ArchivePage(): ReactElement {
  return (
    <RequireRole allow={canOperate}>
      <ArchiveView />
    </RequireRole>
  );
}
