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
import { setPendingOwnerKey } from "@/features/auth/pending-owner-key";

type FormatMessage = ReturnType<typeof useIntl>["formatMessage"];

const THROTTLE_SECONDS_PATTERN = /available in (\d+) seconds/i;

/** Django validation errors come back as `{ field: ["message", ...] }`; these are the fields this form can produce. */
function fieldErrorMessages(body: Record<string, unknown>): string[] {
  const messages: string[] = [];
  for (const field of ["password", "email", "name"]) {
    const value = body[field];
    if (Array.isArray(value)) messages.push(...value.filter((entry): entry is string => typeof entry === "string"));
  }
  return messages;
}

function formatSignupError(error: unknown, formatMessage: FormatMessage): string {
  const body = typeof error === "object" && error !== null ? (error as Record<string, unknown>) : {};
  const status = typeof body.status === "number" ? body.status : undefined;
  const detail = typeof body.detail === "string" ? body.detail : undefined;

  if (status === 429) {
    const seconds = Number(THROTTLE_SECONDS_PATTERN.exec(detail ?? "")?.[1]);
    if (Number.isFinite(seconds) && seconds > 0) {
      return formatMessage(
        {
          id: "page.signup.form.error.throttled",
          defaultMessage:
            "{minutes, plural, one {Too many attempts. Try again in # minute.} other {Too many attempts. Try again in # minutes.}}",
        },
        { minutes: Math.ceil(seconds / 60) },
      );
    }
    return formatMessage({
      id: "page.signup.form.error.throttledGeneric",
      defaultMessage: "Too many attempts. Try again later.",
    });
  }

  const fieldMessages = fieldErrorMessages(body);
  if (fieldMessages.length > 0) return fieldMessages.join(" ");

  if (status === 409 || (detail && /already exists/i.test(detail))) {
    return formatMessage({
      id: "page.signup.form.error.duplicateEmail",
      defaultMessage: "That email is already registered. Try signing in instead.",
    });
  }

  return formatMessage({
    id: "page.signup.form.error.generic",
    defaultMessage: "Something went wrong. Check the details and try again.",
  });
}

export function SignupForm(): ReactElement {
  const { formatMessage } = useIntl();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const signup = useMutation({
    ...authRepository.signup(),
    onSuccess: async (data) => {
      // A freshly-created owner has no session cookie yet (the account is
      // inactive until the email is verified, and login is refused until
      // then), so the one-time api_key is used as a Bearer token to
      // authenticate the verify-pending page in the meantime.
      setPendingOwnerKey(data.api_key);
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
    } catch (caught) {
      setError(formatSignupError(caught, formatMessage));
    }
  }

  return (
    <Frame className="shadow-card w-full" spacing="lg">
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
              <span>
                <FormattedMessage
                  id="page.signup.form.terms"
                  defaultMessage="I agree to the <link>Terms and Conditions</link>."
                  values={{
                    link: (chunks: ReactNode) => (
                      <Link
                        to={routes.terms}
                        target="_blank"
                        className="underline underline-offset-2 text-accent-500"
                      >
                        {chunks}
                      </Link>
                    ),
                  }}
                />
              </span>
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
                <Link to={routes.login} className="underline underline-offset-2 text-accent-500">
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
