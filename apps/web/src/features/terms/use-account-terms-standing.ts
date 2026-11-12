import { useQuery } from "@tanstack/react-query";
import { useIntl } from "react-intl";
import { useMe } from "@/features/auth/use-me";
import { termsLocale, useTermsConfirmed } from "@mtt/contracts/terms";
import { termsStanding, type TermsStanding } from "@/features/terms/model";
import { termsRepository } from "@/features/terms/repository";

/**
 * The signed-in owner's account terms against the version served now. They never lapse.
 * Undefined while unknown, and on an instance that asks for no terms.
 */
export function useAccountTermsStanding(): TermsStanding | undefined {
  const { locale } = useIntl();
  const { me } = useMe();
  const enforced = useTermsConfirmed();
  const current = useQuery(termsRepository.account({ locale: termsLocale(locale) }));
  if (!me || !enforced) return undefined;
  return termsStanding({
    acceptedVersion: me.terms_accepted_version,
    expiresAt: null,
    pausedAt: null,
    currentVersion: current.data?.version,
    now: new Date(),
  });
}
