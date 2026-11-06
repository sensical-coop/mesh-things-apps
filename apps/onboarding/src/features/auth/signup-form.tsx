import { classifySignupFailure, readApiError } from "@mtt/contracts/errors";
import { SignupForm as UiSignupForm } from "@mtt/ui/forms/signup-form";
import { accountTermsQuery, termsLocale, useTermsEnforced } from "@mtt/contracts/terms";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ReactElement, useState } from "react";
import { useIntl } from "react-intl";
import { authRepository } from "@/features/auth/repository";

export function SignupForm(): ReactElement {
  const { formatMessage, locale } = useIntl();
  const terms = useQuery(accountTermsQuery(termsLocale(locale)));
  const termsOff = useTermsEnforced() === false;
  const [termsResetKey, setTermsResetKey] = useState(0);
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const signup = useMutation({
    ...authRepository.signup(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authRepository.meKey() });
    },
  });

  async function onSubmit(values: { name: string; email: string; password: string; accepted: string[] }) {
    setError(null);
    if (!termsOff && (!terms.data || !terms.data.statements.every((statement) => values.accepted.includes(statement.id)))) {
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
          next: "/start",
        },
      });
    } catch (caught) {
      const failure = readApiError(caught);
      const classified = classifySignupFailure(caught);
      if (classified.kind === "throttled") {
        setError(
          classified.retryAfter
            ? formatMessage(
                {
                  id: "page.signup.form.error.throttled",
                  defaultMessage:
                    "{minutes, plural, one {Too many attempts. Try again in # minute.} other {Too many attempts. Try again in # minutes.}}",
                },
                { minutes: Math.ceil(classified.retryAfter / 60) },
              )
            : formatMessage({
                id: "page.signup.form.error.throttledGeneric",
                defaultMessage: "Too many attempts. Try again later.",
              }),
        );
      } else if (classified.kind === "duplicateEmail") {
        setError(
          formatMessage({
            id: "page.signup.form.error.duplicateEmail",
            defaultMessage: "That email is already registered. Try signing in instead.",
          }),
        );
      } else if (classified.kind === "field") {
        setError(classified.message);
      } else {
        setError(
          formatMessage({
            id: "page.signup.form.error.generic",
            defaultMessage: "The account was not created. Check the details and try again.",
          }),
        );
      }
      if (failure.fields.terms_version) {
        setTermsResetKey((key) => key + 1);
        void terms.refetch();
      }
    }
  }

  return (
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
      terms={
        termsOff
          ? null
          : terms.data
            ? {
                title: terms.data.title,
                description: terms.data.description,
                statements: terms.data.statements,
                footnote: (
                  <>
                    {terms.data.footnote}{" "}
                    <a className="text-accent-500 underline underline-offset-2" href="/terms" target="_blank" rel="noreferrer">
                      {formatMessage({ id: "feature.terms.termsLink", defaultMessage: "Read the Mesh Things Terms." })}
                    </a>
                  </>
                ),
              }
            : null
      }
      termsLoading={!termsOff && terms.isPending}
      termsError={
        !termsOff && terms.error
          ? formatMessage({
              id: "page.signup.form.termsLoadError",
              defaultMessage: "The terms didn't load, and the account can't be created yet. Reload the page to try again.",
            })
          : null
      }
      termsResetKey={termsResetKey}
      onSubmit={(values) => void onSubmit(values)}
    />
  );
}
