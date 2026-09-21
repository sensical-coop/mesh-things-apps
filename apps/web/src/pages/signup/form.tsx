import { Button } from "@mtt/ui/components/base/buttons/button";
import { Checkbox } from "@mtt/ui/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@mtt/ui/components/ui/field";
import { Frame, FramePanel } from "@mtt/ui/reui/frame";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { type FormEvent, type ReactElement, type ReactNode, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { FormField } from "@/components/form/form-field";
import { Input } from "@mtt/ui/components/ui/input";
import { routes } from "@/router";
import { StatusCopy } from "@/components/status-copy";
import { authRepository } from "@/features/auth/repository";

export function SignupForm(): ReactElement {
  const { formatMessage } = useIntl();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const signup = useMutation({
    ...authRepository.signup(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authRepository.meKey() });
      await navigate({ to: routes.verifyPending });
    },
  });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    await authRepository.csrf();
    try {
      await signup.mutateAsync({
        body: {
          name: String(form.get("name") ?? ""),
          email: String(form.get("email") ?? ""),
          password: String(form.get("password") ?? ""),
        },
      });
    } catch {
      setError(
        formatMessage({
          id: "page.signup.form.error",
          defaultMessage: "That email may already be registered, or the details weren't accepted.",
        }),
      );
    }
  }

  return (
    <Frame className="shadow-card w-full" spacing="lg">
      <div className="flex items-center px-5 pt-5 pb-2">
        <img src="/brand/snscl-b-t.svg" alt="" className="h-3 w-auto dark:hidden" aria-hidden />
        <img src="/brand/snscl-w-t.svg" alt="" className="hidden h-3 w-auto dark:block" aria-hidden />
      </div>
      <FramePanel className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-title-2-medium tracking-tight text-text-primary">
            {formatMessage({ id: "page.signup.form.title", defaultMessage: "Create your account" })}
          </h1>
          <p className="text-body-regular text-text-secondary">
            {formatMessage({
              id: "page.signup.form.subtitle",
              defaultMessage: "Register an owner account for Meshtastic Things.",
            })}
          </p>
        </div>
        <form className="flex flex-col gap-5" onSubmit={(e) => void onSubmit(e)}>
          <FieldGroup>
            <FormField
              id="signup-name"
              label={formatMessage({ id: "page.signup.form.name", defaultMessage: "Name" })}
            >
              <Input id="signup-name" name="name" type="text" required autoComplete="name" />
            </FormField>
            <FormField
              id="signup-email"
              label={formatMessage({ id: "page.signup.form.email", defaultMessage: "Email" })}
            >
              <Input id="signup-email" name="email" type="email" required autoComplete="username" />
            </FormField>
            <FormField
              id="signup-password"
              label={formatMessage({ id: "page.signup.form.password", defaultMessage: "Password" })}
            >
              <Input
                id="signup-password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </FormField>
          </FieldGroup>
          <Field orientation="horizontal">
            <Checkbox id="signup-terms" name="terms" required />
            <FieldLabel htmlFor="signup-terms" className="text-body-regular text-text-primary">
              <FormattedMessage
                id="page.signup.form.terms"
                defaultMessage="I agree to the <link>Terms and Conditions</link>."
                values={{
                  link: (chunks: ReactNode) => (
                    <Link to={routes.terms} target="_blank" className="underline underline-offset-2">
                      {chunks}
                    </Link>
                  ),
                }}
              />
            </FieldLabel>
          </Field>
          {error ? <StatusCopy>{error}</StatusCopy> : null}
          <Button type="submit" size="small" disabled={signup.isPending} className="mt-1">
            {signup.isPending
              ? formatMessage({ id: "page.signup.form.creating", defaultMessage: "Creating account" })
              : formatMessage({ id: "page.signup.form.submit", defaultMessage: "Create account" })}
          </Button>
        </form>
        <p className="text-caption-1-regular text-text-tertiary">
          <FormattedMessage
            id="page.signup.form.haveAccount"
            defaultMessage="Already have an account? <link>Sign in</link>."
            values={{
              link: (chunks: ReactNode) => (
                <Link to={routes.login} className="underline underline-offset-2">
                  {chunks}
                </Link>
              ),
            }}
          />
        </p>
      </FramePanel>
    </Frame>
  );
}
