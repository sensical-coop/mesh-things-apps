import { useQuery } from "@tanstack/react-query";
import { useIntl } from "react-intl";
import { TERMS_STALE_TIME, termsLocale, useTermsConfirmed } from "@mtt/contracts/terms";
import { termsRepository } from "@/features/terms/repository";

/** The mesh terms served now, fetched only once this instance is known to ask for terms. */
export function useMeshTerms() {
  const { locale } = useIntl();
  const enforced = useTermsConfirmed();
  const current = useQuery({
    ...termsRepository.mesh({ locale: termsLocale(locale) }),
    enabled: enforced,
    staleTime: TERMS_STALE_TIME,
  });
  return { enforced, current: current.data };
}
