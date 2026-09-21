import { parseAsString, useQueryState } from "nuqs";
import { type ReactElement } from "react";
import { AuthHeader } from "@/components/auth-header";
import { ShaderBackdrop } from "@/components/auth-shader-backdrop";
import { ResetPasswordForm } from "./form";

export function ResetPasswordPage(): ReactElement {
  const [token] = useQueryState("token", parseAsString);

  return (
    <main className="relative isolate flex min-h-svh items-center justify-center overflow-hidden bg-background-secondary-default px-4 py-16 sm:px-6 sm:py-24">
      <ShaderBackdrop />
      <AuthHeader />
      <div className="relative w-full max-w-md">
        <ResetPasswordForm token={token} />
      </div>
    </main>
  );
}
