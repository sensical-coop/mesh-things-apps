import { useQuery } from "@tanstack/react-query";
import { useIntl } from "react-intl";
import { getTermsRetrieveQueryOptions } from "./generated/api";
import { readApiError } from "./api-errors";

export type TermsLocale = "en" | "es";

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

/**
 * The account terms, which also tell whether this instance asks for terms at all
 * (`GET /terms` answers 404 when it doesn't). One shared, long-lived query.
 * A 404 isn't retried; the shared query client already treats it as an answer.
 */
export function accountTermsQuery(locale: TermsLocale) {
  return {
    ...getTermsRetrieveQueryOptions({ locale }),
    staleTime: 5 * 60_000,
  };
}

/**
 * Whether this instance asks for terms: `true`, `false` (terms off), or `undefined`
 * while unknown, which callers treat as enforced. Readable without an account.
 */
export function useTermsEnforced(): boolean | undefined {
  const { locale } = useIntl();
  const account = useQuery(accountTermsQuery(termsLocale(locale)));
  return termsEnforcedFrom({
    loaded: account.data !== undefined,
    errorStatus: account.error ? readApiError(account.error).status : undefined,
  });
}
