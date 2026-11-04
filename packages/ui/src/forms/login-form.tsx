import { Button } from "@mtt/ui/components/base/buttons/button";
import { FieldGroup } from "@mtt/ui/components/ui/field";
import { Input } from "@mtt/ui/components/ui/input";
import { type FormEvent, type ReactElement, type ReactNode } from "react";
import { FormField } from "@mtt/ui/forms/form-field";

export type LoginFormValues = { email: string; password: string };

export type LoginFormLabels = {
  email: string;
  password: string;
  submit: string;
  pending: string;
};

export function LoginForm({
  labels,
  error,
  pending,
  onSubmit,
  defaultValues,
  forgotPassword,
  footer,
}: {
  labels: LoginFormLabels;
  error?: string | null;
  pending: boolean;
  onSubmit: (values: LoginFormValues) => void;
  defaultValues?: { email?: string; password?: string };
  forgotPassword?: ReactNode;
  footer?: ReactNode;
}): ReactElement {
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
          <FormField id="login-email" label={labels.email}>
            <Input
              id="login-email"
              name="email"
              type="email"
              required
              autoComplete="username"
              defaultValue={defaultValues?.email}
              aria-invalid={error ? true : undefined}
            />
          </FormField>
          <FormField id="login-password" label={labels.password}>
            <Input
              id="login-password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              defaultValue={defaultValues?.password}
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
          {pending ? labels.pending : labels.submit}
        </Button>
      </form>
      {footer}
    </div>
  );
}
