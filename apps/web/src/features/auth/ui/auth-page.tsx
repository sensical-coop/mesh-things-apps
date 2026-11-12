import { ShaderBackdrop } from "@mtt/ui/components/shader-backdrop";
import type { ReactElement, ReactNode } from "react";
import { AuthHeader } from "./auth-header";

export function AuthPage({
  children,
  bare = false,
}: {
  children: ReactNode;
  /** Only the language switcher instead of the brand bar. */
  bare?: boolean;
}): ReactElement {
  return (
    <main className="relative isolate flex min-h-svh items-center justify-center overflow-hidden bg-background-secondary-default px-4 py-16 sm:px-6 sm:py-24">
      <ShaderBackdrop />
      <AuthHeader bare={bare} />
      <div className="relative w-full max-w-md">{children}</div>
    </main>
  );
}
