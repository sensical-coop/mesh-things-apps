import { Button } from "@mtt/ui/components/base/buttons/button";
import { FieldGroup } from "@mtt/ui/components/ui/field";
import { Input } from "@mtt/ui/components/ui/input";
import { type FormEvent, type ReactElement, type ReactNode } from "react";
import { useIntl } from "react-intl";
import { FormField } from "@mtt/ui/forms/form-field";

/** Style for the link placed in the `forgotPassword` slot. */
export const forgotPasswordLinkClass = "self-end text-caption-1-regular text-text-secondary underline underline-offset-2";

export type LoginFormValues = { email: string; password: string };

export type LoginFailure = { kind: "unauthorized" | "throttled" | "generic" };

export function LoginForm({
  failure,
  pending,
  onSubmit,
  defaults,
  forgotPassword,
  footer,
}: {
  failure?: LoginFailure | null;
  pending: boolean;
  onSubmit: (values: LoginFormValues) => void;
  /** Prefilled values, for demos. */
  defaults?: LoginFormValues;
  forgotPassword?: ReactNode;
  footer?: ReactNode;
}): ReactElement {
  const { formatMessage } = useIntl();
  const error =
    failure?.kind === "unauthorized"
      ? formatMessage({
          id: "page.login.form.error",
          defaultMessage: "Those credentials were not accepted. Check the email and password and try again.",
        })
      : failure?.kind === "throttled"
        ? formatMessage({
            id: "page.login.form.error.throttled",
            defaultMessage: "Too many sign-in attempts. Wait a minute and try again.",
          })
        : failure?.kind === "generic"
          ? formatMessage({
              id: "page.login.form.error.generic",
              defaultMessage: "We couldn't sign you in right now. Try again in a moment.",
            })
          : null;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    onSubmit({
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <form className="flex flex-col gap-5" onSubmit={submit}>
        <FieldGroup>
          <FormField id="login-email" label={formatMessage({ id: "page.login.form.email", defaultMessage: "Email" })}>
            <Input
              id="login-email"
              name="email"
              type="email"
              required
              autoComplete="username"
              defaultValue={defaults?.email}
              aria-invalid={error ? true : undefined}
            />
          </FormField>
          <FormField id="login-password" label={formatMessage({ id: "page.login.form.password", defaultMessage: "Password" })}>
            <Input
              id="login-password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              defaultValue={defaults?.password}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "login-error" : undefined}
            />
          </FormField>
        </FieldGroup>
        {forgotPassword}
        {error ? (
          <p id="login-error" className="text-body-regular text-text-secondary" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" size="small" disabled={pending} className="mt-1">
          {pending
            ? formatMessage({ id: "page.login.form.signingIn", defaultMessage: "Signing in" })
            : formatMessage({ id: "page.login.form.signIn", defaultMessage: "Sign in" })}
        </Button>
      </form>
      {footer}
    </div>
  );
}
