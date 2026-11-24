import { Button } from "@mtt/ui/components/base/buttons/button";
import { FieldGroup } from "@mtt/ui/components/ui/field";
import { Input } from "@mtt/ui/components/ui/input";
import { cx } from "@mtt/ui/utils";
import { RiArrowDownSLine } from "@remixicon/react";
import { type FormEvent, type ReactElement, type ReactNode, useRef, useState } from "react";
import { useIntl } from "react-intl";
import { fieldErrorId, FormField } from "@mtt/ui/forms/form-field";
import { PASSWORD_MIN_LENGTH } from "@mtt/ui/forms/password";
import { TermsLink } from "@mtt/ui/forms/terms-link";
import { TermsChecklist, type TermsStatement } from "@mtt/ui/forms/terms-checklist";

export type SignupFormValues = { name: string; email: string; password: string; accepted: string[] };

export type SignupFailure =
  | { kind: "throttled"; retryAfter: number | undefined }
  | { kind: "duplicateEmail" }
  | { kind: "field"; message: string }
  | { kind: "generic" };

/** The terms as the API serves them. */
export type SignupTerms = {
  title: string;
  description: string;
  statements: readonly TermsStatement[];
  footnote: string;
};

export function SignupForm({
  failure,
  pending,
  terms,
  termsHref,
  termsLoading = false,
  termsLoadFailed = false,
  termsResetKey = 0,
  onSubmit,
  footer,
}: {
  failure?: SignupFailure | null;
  pending: boolean;
  /** Absent when this instance asks for no terms. */
  terms?: SignupTerms;
  /** Where the full terms live, linked after the footnote. */
  termsHref: string;
  termsLoading?: boolean;
  termsLoadFailed?: boolean;
  /** Bump when the served terms changed so previous ticks are cleared. */
  termsResetKey?: number;
  onSubmit: (values: SignupFormValues) => void;
  footer?: ReactNode;
}): ReactElement {
  const { formatMessage } = useIntl();
  const [accepted, setAccepted] = useState<ReadonlySet<string>>(new Set());
  const [credentials, setCredentials] = useState({ email: "", password: "", confirm: "" });
  const [termsOpen, setTermsOpen] = useState(false);
  const [termsMissing, setTermsMissing] = useState(false);
  const autoOpened = useRef(false);
  const [seenReset, setSeenReset] = useState(termsResetKey);
  if (seenReset !== termsResetKey) {
    setSeenReset(termsResetKey);
    setAccepted(new Set());
    setTermsOpen(true);
  }
  const credentialsReady = credentials.email.trim() !== "" && credentials.password !== "";
  const passwordMismatch = credentials.confirm !== "" && credentials.confirm !== credentials.password;
  const showTerms = terms !== undefined || termsLoading || termsLoadFailed;
  const statements = terms?.statements ?? [];
  const termsAccepted =
    !showTerms || (terms !== undefined && statements.length > 0 && statements.every((statement) => accepted.has(statement.id)));

  const failureMessage =
    failure?.kind === "throttled"
      ? failure.retryAfter
        ? formatMessage(
            {
              id: "page.signup.form.error.throttled",
              defaultMessage:
                "{minutes, plural, one {Too many attempts. Try again in # minute.} other {Too many attempts. Try again in # minutes.}}",
            },
            { minutes: Math.ceil(failure.retryAfter / 60) },
          )
        : formatMessage({
            id: "page.signup.form.error.throttledGeneric",
            defaultMessage: "Too many attempts. Try again later.",
          })
      : failure?.kind === "duplicateEmail"
        ? formatMessage({
            id: "page.signup.form.error.duplicateEmail",
            defaultMessage: "That email is already registered. Try signing in instead.",
          })
        : failure?.kind === "field"
          ? failure.message
          : failure?.kind === "generic"
            ? formatMessage({
                id: "page.signup.form.error.generic",
                defaultMessage: "Something went wrong. Check the details and try again.",
              })
            : null;

  function onCredential(field: "email" | "password" | "confirm", value: string) {
    const next = { ...credentials, [field]: value };
    if (!autoOpened.current && next.email.trim() !== "" && next.password !== "") {
      autoOpened.current = true;
      setTermsOpen(true);
    }
    setCredentials(next);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || passwordMismatch) return;
    if (!termsAccepted) {
      setTermsMissing(true);
      return;
    }
    setTermsMissing(false);
    const form = new FormData(event.currentTarget);
    onSubmit({
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      accepted: [...accepted],
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <form className="flex flex-col gap-5" onSubmit={submit}>
        <FieldGroup>
          <FormField id="signup-name" label={formatMessage({ id: "page.signup.form.name", defaultMessage: "Name" })}>
            <Input id="signup-name" name="name" type="text" required autoComplete="name" />
          </FormField>
          <FormField id="signup-email" label={formatMessage({ id: "page.signup.form.email", defaultMessage: "Email" })}>
            <Input
              id="signup-email"
              name="email"
              type="email"
              required
              autoComplete="username"
              onChange={(event) => onCredential("email", event.currentTarget.value)}
            />
          </FormField>
          <FormField id="signup-password" label={formatMessage({ id: "page.signup.form.password", defaultMessage: "Password" })}>
            <Input
              id="signup-password"
              name="password"
              type="password"
              required
              minLength={PASSWORD_MIN_LENGTH}
              autoComplete="new-password"
              onChange={(event) => onCredential("password", event.currentTarget.value)}
            />
          </FormField>
          <FormField
            id="signup-confirm-password"
            label={formatMessage({ id: "page.signup.form.confirmPassword", defaultMessage: "Confirm password" })}
            error={
              passwordMismatch
                ? formatMessage({ id: "page.signup.form.error.mismatch", defaultMessage: "Passwords don't match." })
                : undefined
            }
          >
            <Input
              id="signup-confirm-password"
              name="confirm_password"
              type="password"
              required
              minLength={PASSWORD_MIN_LENGTH}
              autoComplete="new-password"
              aria-invalid={passwordMismatch || undefined}
              aria-describedby={passwordMismatch ? fieldErrorId("signup-confirm-password") : undefined}
              onChange={(event) => onCredential("confirm", event.currentTarget.value)}
            />
          </FormField>
        </FieldGroup>
        {showTerms ? (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              className="flex w-full items-start justify-between gap-3 rounded-lg text-start outline-hidden focus-visible:ring-2 focus-visible:ring-border-focus-ring disabled:cursor-not-allowed"
              aria-expanded={termsOpen}
              aria-controls="signup-terms-panel"
              disabled={!credentialsReady && !termsOpen}
              onClick={() => setTermsOpen((open) => !open)}
            >
              <span className="flex flex-col gap-0.5">
                <span className={cx("text-body-medium", credentialsReady || termsOpen ? "text-text-primary" : "text-text-tertiary")}>
                  {terms?.title ?? formatMessage({ id: "page.signup.form.termsTitle", defaultMessage: "Terms" })}
                </span>
                <span className="text-caption-1-regular text-text-tertiary">
                  {!credentialsReady && !termsOpen
                    ? formatMessage({
                        id: "page.signup.form.termsLocked",
                        defaultMessage: "Add your email and password to see the terms.",
                      })
                    : formatMessage(
                        { id: "page.signup.form.termsProgress", defaultMessage: "{accepted} of {total} accepted" },
                        { accepted: accepted.size, total: statements.length },
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
              <div id="signup-terms-panel" className="flex oa-arrive flex-col gap-3">
                {terms ? <p className="text-caption-1-regular text-text-secondary">{terms.description}</p> : null}
                {termsLoading ? (
                  <div className="flex flex-col gap-2" aria-hidden>
                    {Array.from({ length: 3 }, (_, index) => (
                      <div key={index} className="h-5 rounded-full bg-background-tertiary-default" />
                    ))}
                  </div>
                ) : null}
                {termsLoadFailed ? (
                  <p className="text-body-regular text-text-secondary" role="alert">
                    {formatMessage({
                      id: "page.signup.form.termsLoadError",
                      defaultMessage:
                        "The terms didn't load, and the account can't be created yet. Reload the page to try again.",
                    })}
                  </p>
                ) : null}
                {terms ? (
                  <TermsChecklist
                    statements={terms.statements}
                    footnote={
                      <>
                        {terms.footnote} <TermsLink href={termsHref} />
                      </>
                    }
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
        ) : null}
        {termsMissing && !termsAccepted ? (
          <p className="text-body-regular text-text-secondary" role="alert">
            {formatMessage({
              id: "page.signup.form.termsRequired",
              defaultMessage: "Accept each statement to create your account.",
            })}
          </p>
        ) : null}
        {failureMessage ? (
          <p className="text-body-regular text-text-secondary" role="alert">
            {failureMessage}
          </p>
        ) : null}
        <Button type="submit" size="small" disabled={pending || !termsAccepted} className="mt-1">
          {pending
            ? formatMessage({ id: "page.signup.form.creating", defaultMessage: "Creating account" })
            : formatMessage({ id: "page.signup.form.submit", defaultMessage: "Create account" })}
        </Button>
      </form>
      {footer}
    </div>
  );
}
