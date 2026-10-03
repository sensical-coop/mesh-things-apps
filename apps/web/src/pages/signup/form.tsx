import { Button } from "@mtt/ui/components/base/buttons/button";
import { FieldGroup } from "@mtt/ui/components/ui/field";
import { Frame, FramePanel } from "@mtt/ui/reui/frame";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { type FormEvent, type ReactElement, type ReactNode, useRef, useState } from "react";
import { RiArrowDownSLine } from "@remixicon/react";
import { cx } from "@mtt/ui/utils";
import { FormattedMessage, useIntl } from "react-intl";
import { FormField } from "@/components/form/form-field";
import { Input } from "@mtt/ui/components/ui/input";
import { routes } from "@/router";
import { StatusCopy } from "@/components/status-copy";
import { SkeletonRows } from "@/components/skeleton-rows";
import { readApiError } from "@/lib/api-errors";
import { authRepository } from "@/features/auth/repository";
import { allStatementsAccepted, termsLocale } from "@/features/terms/model";
import { accountTermsQuery } from "@/features/terms/repository";
import { useTermsEnforced } from "@/features/terms/use-terms-enforced";
import { TermsChecklist } from "@/features/terms/ui/terms-checklist";

type FormatMessage = ReturnType<typeof useIntl>["formatMessage"];

const THROTTLE_SECONDS_PATTERN = /available in (\d+) seconds/i;

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

export function SignupForm(): ReactElement {
  const { formatMessage, locale } = useIntl();
  // Signing up accepts the account terms; the API serves their text and version. A
  // self-hosted instance asks for none (the route answers 404): no terms block at all.
  const terms = useQuery(accountTermsQuery(termsLocale(locale)));
  const termsOff = useTermsEnforced() === false;
  const [accepted, setAccepted] = useState<ReadonlySet<string>>(new Set());
  // The terms stay folded until the email and password are in, then open once by themselves.
  const [credentials, setCredentials] = useState({ email: "", password: "", confirm: "" });
  const [termsOpen, setTermsOpen] = useState(false);
  const autoOpened = useRef(false);
  const credentialsReady = credentials.email.trim() !== "" && credentials.password !== "";
  const passwordMismatch = credentials.confirm !== "" && credentials.confirm !== credentials.password;
  const mismatchMessage = formatMessage({ id: "page.signup.form.error.mismatch", defaultMessage: "Passwords don't match." });

  function onCredential(field: "email" | "password" | "confirm", value: string) {
    const next = { ...credentials, [field]: value };
    setCredentials(next);
    if (!autoOpened.current && next.email.trim() !== "" && next.password !== "") {
      autoOpened.current = true;
      setTermsOpen(true);
    }
  }
  const termsAccepted =
    termsOff ||
    (terms.data !== undefined &&
    allStatementsAccepted(
      terms.data.statements.map((statement) => statement.id),
      accepted,
    ));
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const signup = useMutation({
    ...authRepository.signup(),
    // Signup signs the new owner in with a session cookie; the api_key in the
    // response is for scripts and is not kept.
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authRepository.meKey() });
      await navigate({ to: routes.verifyPending });
    },
  });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    if (!termsOff && (!terms.data || !termsAccepted)) {
      setTermsOpen(true);
      setError(
        formatMessage({
          id: "page.signup.form.termsRequired",
          defaultMessage: "Accept each statement to create your account.",
        }),
      );
      return;
    }
    if (form.get("password") !== form.get("confirm_password")) {
      setError(mismatchMessage);
      return;
    }
    await authRepository.csrf();
    try {
      await signup.mutateAsync({
        body: {
          name: String(form.get("name") ?? ""),
          email: String(form.get("email") ?? ""),
          password: String(form.get("password") ?? ""),
          ...(terms.data ? { terms_version: terms.data.version, terms_locale: termsLocale(terms.data.locale) } : {}),
        },
      });
    } catch (caught) {
      setError(formatSignupError(caught, formatMessage));
      // Out-of-date terms: load the current text so it can be accepted again.
      if (readApiError(caught).fields.terms_version) {
        setAccepted(new Set());
        setTermsOpen(true);
        void terms.refetch();
      }
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
              defaultMessage: "Register an owner account for Mesh Things.",
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
              <Input
                id="signup-email"
                name="email"
                type="email"
                required
                autoComplete="username"
                onChange={(event) => onCredential("email", event.currentTarget.value)}
              />
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
                onChange={(event) => onCredential("password", event.currentTarget.value)}
              />
            </FormField>
            <FormField
              id="signup-confirm-password"
              label={formatMessage({ id: "page.signup.form.confirmPassword", defaultMessage: "Confirm password" })}
              error={passwordMismatch ? mismatchMessage : undefined}
            >
              <Input
                id="signup-confirm-password"
                name="confirm_password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                aria-invalid={passwordMismatch || undefined}
                onChange={(event) => onCredential("confirm", event.currentTarget.value)}
              />
            </FormField>
          </FieldGroup>
          {termsOff ? null : (
            <div className="flex flex-col gap-3">
              <button
                type="button"
                className="flex w-full items-start justify-between gap-3 rounded-lg text-start outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring disabled:cursor-not-allowed"
                aria-expanded={termsOpen}
                aria-controls="signup-terms-panel"
                disabled={!credentialsReady && !termsOpen}
                onClick={() => setTermsOpen((open) => !open)}
              >
                <span className="flex flex-col gap-0.5">
                  <span className={cx("text-body-medium", credentialsReady || termsOpen ? "text-text-primary" : "text-text-tertiary")}>
                    {terms.data?.title ??
                      formatMessage({ id: "page.signup.form.termsTitle", defaultMessage: "Terms" })}
                  </span>
                  <span className="text-caption-1-regular text-text-tertiary">
                    {!credentialsReady && !termsOpen
                      ? formatMessage({
                          id: "page.signup.form.termsLocked",
                          defaultMessage: "Add your email and password to see the terms.",
                        })
                      : formatMessage(
                          {
                            id: "page.signup.form.termsProgress",
                            defaultMessage: "{accepted} of {total} accepted",
                          },
                          { accepted: accepted.size, total: terms.data?.statements.length ?? 0 },
                        )}
                  </span>
                </span>
                <RiArrowDownSLine
                  aria-hidden
                  className={cx(
                    "mt-0.5 size-5 shrink-0 text-text-tertiary transition-transform motion-reduce:transition-none",
                    termsOpen && "rotate-180",
                  )}
                />
              </button>
              {termsOpen ? (
                <div id="signup-terms-panel" className="oa-arrive flex flex-col gap-3">
                  {terms.data ? (
                    <p className="text-caption-1-regular text-text-secondary">{terms.data.description}</p>
                  ) : null}
                  {terms.isPending ? <SkeletonRows /> : null}
                  {terms.error ? (
                    <StatusCopy>
                      {formatMessage({
                        id: "page.signup.form.termsLoadError",
                        defaultMessage: "The terms didn't load, and the account can't be created yet. Reload the page to try again.",
                      })}
                    </StatusCopy>
                  ) : null}
                  {terms.data ? (
                    <TermsChecklist
                      terms={terms.data}
                      kind="account"
                      accepted={accepted}
                      idPrefix="signup-terms"
                      onToggle={(id, checked) =>
                        setAccepted((current) => {
                          const next = new Set(current);
                          if (checked) next.add(id);
                          else next.delete(id);
                          return next;
                        })
                      }
                    />
                  ) : null}
                </div>
              ) : null}
            </div>
          )}
          {error ? <StatusCopy>{error}</StatusCopy> : null}
          <Button type="submit" size="small" disabled={signup.isPending || !termsAccepted} className="mt-1">
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
