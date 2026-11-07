import type { ReactElement, ReactNode } from "react";
import { AuthHeader } from "./auth-header";
import { ShaderBackdrop } from "./auth-shader-backdrop";

export function AuthPage({
  children,
  header,
}: {
  children: ReactNode;
  /** Replaces the brand bar. Pass null when the page draws its own. */
  header?: ReactNode | null;
}): ReactElement {
  return (
    <main className="relative isolate flex min-h-svh items-center justify-center overflow-hidden bg-background-secondary-default px-4 py-16 sm:px-6 sm:py-24">
      <ShaderBackdrop />
      {header === undefined ? <AuthHeader /> : header}
      <div className="relative w-full max-w-md">{children}</div>
    </main>
  );
}
