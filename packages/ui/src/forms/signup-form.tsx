import { Button } from "@mtt/ui/components/base/buttons/button";
import { FieldGroup } from "@mtt/ui/components/ui/field";
import { Input } from "@mtt/ui/components/ui/input";
import { cx } from "@mtt/ui/utils/cx";
import { RiArrowDownSLine } from "@remixicon/react";
import { type FormEvent, type ReactElement, type ReactNode, useRef, useState } from "react";
import { FormField } from "@mtt/ui/forms/form-field";
import { TermsChecklist, type TermsStatement } from "@mtt/ui/forms/terms-checklist";

export type SignupFormValues = { name: string; email: string; password: string; accepted: string[] };

export type SignupTerms = {
  title: string;
  description: string;
  statements: readonly TermsStatement[];
  footnote?: ReactNode;
};

export type SignupFormLabels = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  mismatch: string;
  termsTitle: string;
  termsLocked: string;
  termsProgress: (accepted: number, total: number) => string;
  submit: string;
  pending: string;
};

export function SignupForm({
  labels,
  error,
  pending,
  terms,
  termsLoading = false,
  termsError,
  termsResetKey = 0,
  onSubmit,
  footer,
}: {
  labels: SignupFormLabels;
  error?: string | null;
  pending: boolean;
  /** `null` when this instance asks for no terms. */
  terms: SignupTerms | null;
  termsLoading?: boolean;
  termsError?: string | null;
  /** Bump when the served terms changed so previous ticks are cleared. */
  termsResetKey?: number;
  onSubmit: (values: SignupFormValues) => void;
  footer?: ReactNode;
}): ReactElement {
  const [accepted, setAccepted] = useState<ReadonlySet<string>>(new Set());
  const [credentials, setCredentials] = useState({ email: "", password: "", confirm: "" });
  const [termsOpen, setTermsOpen] = useState(false);
  const autoOpened = useRef(false);
  const [seenReset, setSeenReset] = useState(termsResetKey);
  if (seenReset !== termsResetKey) {
    setSeenReset(termsResetKey);
    setAccepted(new Set());
    setTermsOpen(true);
  }
  const credentialsReady = credentials.email.trim() !== "" && credentials.password !== "";
  const passwordMismatch = credentials.confirm !== "" && credentials.confirm !== credentials.password;
  const showTerms = terms !== null || termsLoading || Boolean(termsError);
  const statements = terms?.statements ?? [];
  const termsAccepted =
    !showTerms || (terms !== null && statements.length > 0 && statements.every((statement) => accepted.has(statement.id)));

  function onCredential(field: "email" | "password" | "confirm", value: string) {
    setCredentials((current) => {
      const next = { ...current, [field]: value };
      if (!autoOpened.current && next.email.trim() !== "" && next.password !== "") {
        autoOpened.current = true;
        setTermsOpen(true);
      }
      return next;
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || passwordMismatch || !termsAccepted) return;
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
          <FormField id="signup-name" label={labels.name}>
            <Input id="signup-name" name="name" type="text" required autoComplete="name" />
          </FormField>
          <FormField id="signup-email" label={labels.email}>
            <Input
              id="signup-email"
              name="email"
              type="email"
              required
              autoComplete="username"
              onChange={(event) => onCredential("email", event.currentTarget.value)}
            />
          </FormField>
          <FormField id="signup-password" label={labels.password}>
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
            label={labels.confirmPassword}
            error={passwordMismatch ? labels.mismatch : undefined}
          >
            <Input
              id="signup-confirm-password"
              name="confirm_password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              aria-invalid={passwordMismatch || undefined}
              aria-describedby={passwordMismatch ? "signup-confirm-password-error" : undefined}
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
                  {terms?.title ?? labels.termsTitle}
                </span>
                <span className="text-caption-1-regular text-text-tertiary">
                  {!credentialsReady && !termsOpen
                    ? labels.termsLocked
                    : labels.termsProgress(accepted.size, statements.length)}
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
                {terms ? <p className="text-caption-1-regular text-text-secondary">{terms.description}</p> : null}
                {termsLoading ? (
                  <div className="flex flex-col gap-2" aria-hidden>
                    {Array.from({ length: 3 }, (_, index) => (
                      <div key={index} className="h-5 rounded-full bg-background-tertiary-default" />
                    ))}
                  </div>
                ) : null}
                {termsError ? (
                  <p className="text-body-regular text-text-secondary" role="alert">
                    {termsError}
                  </p>
                ) : null}
                {terms ? (
                  <TermsChecklist
                    statements={terms.statements}
                    footnote={terms.footnote}
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
        {error ? (
          <p className="text-body-regular text-text-secondary" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" size="small" disabled={pending || !termsAccepted} className="mt-1">
          {pending ? labels.pending : labels.submit}
        </Button>
      </form>
      {footer}
    </div>
  );
}
