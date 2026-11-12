import { canOperate } from "@mtt/contracts/authz";
import { type ReactElement } from "react";
import { RequireRole } from "@/features/auth/require-role";
import { SinksView } from "./view";

export function SinksPage(): ReactElement {
  return (
    <RequireRole allow={canOperate}>
      <SinksView />
    </RequireRole>
  );
}
