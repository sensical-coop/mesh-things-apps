import { useQuery } from "@tanstack/react-query";
import { useIntl } from "react-intl";
import { readApiError } from "@/lib/api-errors";
import { termsEnforcedFrom, termsLocale } from "@/features/terms/model";
import { accountTermsQuery } from "@/features/terms/repository";

/**
 * Whether this instance asks for terms: `true`, `false` (a self-hosted instance with
 * REGISTRY__TERMS_ENFORCED=false), or `undefined` while unknown, which callers treat as
 * enforced. Readable without an account, so signup can use it too.
 */
export function useTermsEnforced(): boolean | undefined {
  const { locale } = useIntl();
  const account = useQuery(accountTermsQuery(termsLocale(locale)));
  return termsEnforcedFrom({
    loaded: account.data !== undefined,
    errorStatus: account.error ? readApiError(account.error).status : undefined,
  });
}
