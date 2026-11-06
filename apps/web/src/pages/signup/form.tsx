import { Frame, FramePanel } from "@mtt/ui/reui/frame";
import { SignupForm as UiSignupForm } from "@mtt/ui/forms/signup-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { type ReactElement, type ReactNode, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { routes } from "@/router";
import { readApiError } from "@mtt/contracts/errors";
import { authRepository } from "@/features/auth/repository";
import { termsLocale } from "@/features/terms/model";
import { accountTermsQuery } from "@/features/terms/repository";
import { useTermsEnforced } from "@/features/terms/use-terms-enforced";

type FormatMessage = ReturnType<typeof useIntl>["formatMessage"];

const THROTTLE_SECONDS_PATTERN = /available in (\d+) seconds/i;
const linkClass = "text-accent-500 underline underline-offset-2";

/** Django validation errors come back as `{ field: ["message", ...] }`; these are the fields this form can produce. */
function fieldErrorMessages(body: Record<string, unknown>): string[] {
  const messages: string[] = [];
  for (const field of ["password", "email", "name", "terms_version"]) {
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

export function SignupForm({
  next,
  onSignedUp,
}: {
  next?: string;
  onSignedUp?: () => void | Promise<void>;
} = {}): ReactElement {
  const { formatMessage, locale } = useIntl();
  // Signing up accepts the account terms; the API serves their text and version. A
  // self-hosted instance asks for none (the route answers 404): no terms block at all.
  const terms = useQuery(accountTermsQuery(termsLocale(locale)));
  const termsOff = useTermsEnforced() === false;
  const [termsResetKey, setTermsResetKey] = useState(0);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const signup = useMutation({
    ...authRepository.signup(),
    // Signup signs the new owner in with a session cookie; the api_key in the
    // response is for scripts and is not kept.
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authRepository.meKey() });
      if (onSignedUp) {
        await onSignedUp();
        return;
      }
      await navigate({ to: routes.verifyPending });
    },
  });

  async function onSubmit(values: { name: string; email: string; password: string; accepted: string[] }) {
    setError(null);
    if (!termsOff && !terms.data) {
      setError(
        formatMessage({
          id: "page.signup.form.termsRequired",
          defaultMessage: "Accept each statement to create your account.",
        }),
      );
      return;
    }
    if (!termsOff && terms.data && !terms.data.statements.every((statement) => values.accepted.includes(statement.id))) {
      setError(
        formatMessage({
          id: "page.signup.form.termsRequired",
          defaultMessage: "Accept each statement to create your account.",
        }),
      );
      return;
    }
    await authRepository.csrf();
    try {
      await signup.mutateAsync({
        data: {
          name: values.name,
          email: values.email,
          password: values.password,
          ...(terms.data ? { terms_version: terms.data.version, terms_locale: termsLocale(terms.data.locale) } : {}),
          ...(next ? { next } : {}),
        },
      });
    } catch (caught) {
      setError(formatSignupError(caught, formatMessage));
      // Out-of-date terms: load the current text so it can be accepted again.
      if (readApiError(caught).fields.terms_version) {
        setTermsResetKey((key) => key + 1);
        void terms.refetch();
      }
    }
  }

  const termsCopy = termsOff
    ? null
    : terms.data
      ? {
          title: terms.data.title,
          description: terms.data.description,
          statements: terms.data.statements,
          footnote: (
            <>
              {terms.data.footnote}{" "}
              <Link to={routes.terms} target="_blank" className={linkClass}>
                {formatMessage({ id: "feature.terms.termsLink", defaultMessage: "Read the Mesh Things Terms." })}
              </Link>
            </>
          ),
        }
      : null;

  return (
    <Frame className="w-full shadow-card" spacing="lg">
      <FramePanel className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-title-2-medium tracking-tight text-text-primary">
            {formatMessage({ id: "page.signup.form.title", defaultMessage: "Create your account" })}
          </h1>
          <p className="text-body-regular text-text-secondary">
            {formatMessage({
              id: "page.signup.form.subtitle",
              defaultMessage: "Register an owner account for Mesh Things.",
            })}
          </p>
        </div>
        <UiSignupForm
          labels={{
            name: formatMessage({ id: "page.signup.form.name", defaultMessage: "Name" }),
            email: formatMessage({ id: "page.signup.form.email", defaultMessage: "Email" }),
            password: formatMessage({ id: "page.signup.form.password", defaultMessage: "Password" }),
            confirmPassword: formatMessage({ id: "page.signup.form.confirmPassword", defaultMessage: "Confirm password" }),
            mismatch: formatMessage({ id: "page.signup.form.error.mismatch", defaultMessage: "Passwords don't match." }),
            termsTitle: formatMessage({ id: "page.signup.form.termsTitle", defaultMessage: "Terms" }),
            termsLocked: formatMessage({
              id: "page.signup.form.termsLocked",
              defaultMessage: "Add your email and password to see the terms.",
            }),
            termsProgress: (accepted, total) =>
              formatMessage(
                { id: "page.signup.form.termsProgress", defaultMessage: "{accepted} of {total} accepted" },
                { accepted, total },
              ),
            submit: formatMessage({ id: "page.signup.form.submit", defaultMessage: "Create account" }),
            pending: formatMessage({ id: "page.signup.form.creating", defaultMessage: "Creating account" }),
          }}
          error={error}
          pending={signup.isPending}
          terms={termsCopy}
          termsLoading={!termsOff && terms.isPending}
          termsError={
            !termsOff && terms.error
              ? formatMessage({
                  id: "page.signup.form.termsLoadError",
                  defaultMessage:
                    "The terms didn't load, and the account can't be created yet. Reload the page to try again.",
                })
              : null
          }
          termsResetKey={termsResetKey}
          onSubmit={(values) => void onSubmit(values)}
          footer={
            <p className="text-caption-1-regular text-text-tertiary">
              <FormattedMessage
                id="page.signup.form.haveAccount"
                defaultMessage="Already have an account? <link>Sign in</link>."
                values={{
                  link: (chunks: ReactNode) => (
                    <Link to={routes.login} className={linkClass}>
                      {chunks}
                    </Link>
                  ),
                }}
              />
            </p>
          }
        />
      </FramePanel>
    </Frame>
  );
}
