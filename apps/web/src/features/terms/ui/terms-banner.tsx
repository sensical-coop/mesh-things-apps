import { useQuery } from "@tanstack/react-query";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { useMe } from "@/features/auth/use-me";
import { meshTermsStanding } from "@/features/mesh/model";
import { meshRepository } from "@/features/mesh/repository";
import { termsLocale } from "@/features/terms/model";
import { termsRepository } from "@/features/terms/repository";
import { useAccountTermsStanding } from "@/features/terms/use-account-terms-standing";
import { useTermsEnforced } from "@/features/terms/use-terms-enforced";
import { routes } from "@/router";
import { RouterButtonLink } from "@/components/router-button-link";

/**
 * Across the console: meshes of the owner's that stopped storing data because
 * their terms lapsed (to the meshes list), or account terms that changed (to Profile).
 */
export function TermsBanner(): ReactElement | null {
  const { formatMessage, locale } = useIntl();
  const { me } = useMe();
  const account = useAccountTermsStanding();
  // Nothing lapses on an instance that asks for no terms.
  const enforced = useTermsEnforced() === true;
  const owned = useQuery({
    ...meshRepository.list({ query: { owned: true } }),
    enabled: me !== undefined && enforced,
  });
  const meshTerms = useQuery({
    ...termsRepository.mesh({ query: { locale: termsLocale(locale) } }),
    enabled: me !== undefined && enforced,
  });
  const now = new Date();
  const lapsed = (enforced ? (owned.data ?? []) : []).filter(
    (mesh) => meshTermsStanding(mesh, meshTerms.data?.version, now) === "lapsed",
  ).length;

  const shown =
    lapsed > 0
      ? {
          message: formatMessage(
            {
              id: "feature.terms.banner.meshesLapsed",
              defaultMessage:
                "{count, plural, one {A mesh of yours stopped} other {# of your meshes stopped}} storing data because its terms lapsed. Renew them from the mesh page to resume.",
            },
            { count: lapsed },
          ),
          action: formatMessage({ id: "feature.terms.banner.openMeshes", defaultMessage: "Open meshes" }),
          href: routes.meshes,
        }
      : account === "outdated"
        ? {
            message: formatMessage({
              id: "feature.terms.banner.accountOutdated",
              defaultMessage: "The Terms of Use or Privacy Policy changed. Review and accept the new version.",
            }),
            action: formatMessage({ id: "feature.terms.banner.action", defaultMessage: "Review terms" }),
            href: routes.profile,
          }
        : null;
  if (!shown) return null;
  return (
    <div
      role="alert"
      className="oa-squircle mb-6 flex flex-wrap items-center justify-between gap-3 bg-background-secondary-default px-4 py-3 shadow-card"
    >
      <p className="text-body-regular text-text-primary">{shown.message}</p>
      <RouterButtonLink to={shown.href} size="small">
        {shown.action}
      </RouterButtonLink>
    </div>
  );
}
