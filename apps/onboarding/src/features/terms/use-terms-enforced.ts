import { useQuery } from "@tanstack/react-query";
import { useIntl } from "react-intl";
import { readApiError } from "@mtt/contracts/errors";
import { termsEnforcedFrom, termsLocale } from "@mtt/ui/terms";
import { accountTermsQuery } from "@/features/terms/repository";

/** `false` when `GET /terms` is 404. Unknown stays `undefined` and counts as enforced. */
export function useTermsEnforced(): boolean | undefined {
  const { locale } = useIntl();
  const account = useQuery(accountTermsQuery(termsLocale(locale)));
  return termsEnforcedFrom({
    loaded: account.data !== undefined,
    errorStatus: account.error ? readApiError(account.error).status : undefined,
  });
}
