import { canManageSinks } from "@mtt/contracts/authz";
import { type ReactElement } from "react";
import { RequireRole } from "@/components/require-role";
import { SinksView } from "./view";

export function SinksPage(): ReactElement {
  return (
    <RequireRole allow={canManageSinks}>
      <SinksView />
    </RequireRole>
  );
}
