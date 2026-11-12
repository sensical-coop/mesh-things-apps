import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useIntl } from "react-intl";
import { readApiError } from "./api-errors";
import { getTermsRetrieveQueryOptions } from "./generated/api";
import type { OwnerCreate, TermsLocaleEnum } from "./generated/model.zod";

export type TermsLocale = TermsLocaleEnum;

/** What was accepted: sent back as `terms_version` and `terms_locale`. */
export type TermsAcceptance = { version: string; locale: TermsLocale };

/** The body fields that carry an acceptance. */
export function termsFields(acceptance: TermsAcceptance): { terms_version: string; terms_locale: TermsLocale } {
  return { terms_version: acceptance.version, terms_locale: acceptance.locale };
}

/** The API serves `en` and `es`; any other console language gets English. */
export function termsLocale(intlLocale: string): TermsLocale {
  return intlLocale.toLowerCase().startsWith("es") ? "es" : "en";
}

/** Every statement the API sent must be ticked; an empty list accepts nothing. */
export function allStatementsAccepted(statementIds: readonly string[], accepted: ReadonlySet<string>): boolean {
  return statementIds.length > 0 && statementIds.every((id) => accepted.has(id));
}

/**
 * Whether this instance asks for terms, from the answer to `GET /terms`. A self-hosted
 * instance answers 404. Unknown (still loading, or another error) is `undefined`.
 */
export function termsEnforcedFrom(state: { loaded: boolean; errorStatus: number | undefined }): boolean | undefined {
  if (state.loaded) return true;
  if (state.errorStatus === 404) return false;
  return undefined;
}

/** The terms version changes only when the terms are republished. */
export const TERMS_STALE_TIME = 5 * 60_000;

/**
 * The account terms, which also tell whether this instance asks for terms at all
 * (`GET /terms` answers 404 when it doesn't). One shared, long-lived query.
 * A 404 isn't retried; the shared query client already treats it as an answer.
 */
export function accountTermsQuery(locale: TermsLocale) {
  return {
    ...getTermsRetrieveQueryOptions({ locale }),
    staleTime: TERMS_STALE_TIME,
  };
}

function useTermsEnforcedState(): boolean | undefined {
  const { locale } = useIntl();
  const account = useQuery(accountTermsQuery(termsLocale(locale)));
  return termsEnforcedFrom({
    loaded: account.data !== undefined,
    errorStatus: account.error ? readApiError(account.error).status : undefined,
  });
}

/** Gate an action on terms: unknown (still loading) counts as asked, so nothing slips past. Only a known "terms off" is `false`. */
export function useTermsAsked(): boolean {
  return useTermsEnforcedState() !== false;
}

/** Show a terms standing or fetch the terms: waits for a definite yes, so unknown shows nothing. */
export function useTermsConfirmed(): boolean {
  return useTermsEnforcedState() === true;
}

export type SignupTerms = {
  version: string;
  locale: string;
  statements: readonly { id: string }[];
};

/**
 * Ticks and verdict for one terms payload (a `useQuery` result). `notRequired` is a 404:
 * the instance asks for no terms, so `acceptance` is `null` and `complete` is true.
 * `acceptance` is otherwise set as soon as the terms loaded; `complete` waits for every tick.
 */
export function useTermsAcceptance(query: { data: SignupTerms | undefined; error: unknown }) {
  const [accepted, setAccepted] = useState<ReadonlySet<string>>(new Set());
  const notRequired = query.error ? readApiError(query.error).status === 404 : false;
  const statementIds = (query.data?.statements ?? []).map((statement) => statement.id);
  const complete = notRequired || (query.data !== undefined && allStatementsAccepted(statementIds, accepted));
  const acceptance: TermsAcceptance | null =
    notRequired || !query.data ? null : { version: query.data.version, locale: termsLocale(query.data.locale) };

  function toggle(id: string, checked: boolean) {
    setAccepted((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  return { notRequired, accepted, complete, acceptance, toggle, reset: () => setAccepted(new Set()) };
}

/**
 * Signup body, or `null` when enforced terms are missing or not fully ticked.
 * `terms_version` / `terms_locale` are sent only when the terms payload loaded.
 * `next` is sent only when the caller has one.
 */
export function signupCreateBody(
  values: { name: string; email: string; password: string; accepted: readonly string[] },
  terms: { off: boolean; current: SignupTerms | undefined },
  next?: string,
): OwnerCreate | null {
  const current = terms.current;
  if (
    !terms.off &&
    (!current ||
      !allStatementsAccepted(
        current.statements.map((statement) => statement.id),
        new Set(values.accepted),
      ))
  ) {
    return null;
  }
  return {
    name: values.name,
    email: values.email,
    password: values.password,
    ...(current ? { terms_version: current.version, terms_locale: termsLocale(current.locale) } : {}),
    ...(next ? { next } : {}),
  };
}

/** The API rejected the signup because the accepted terms version is stale. */
export function signupTermsStale(error: unknown): boolean {
  return Boolean(readApiError(error).fields.terms_version);
}
