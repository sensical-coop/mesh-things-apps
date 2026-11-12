import { useQuery } from "@tanstack/react-query";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { useMe } from "@/features/auth/use-me";
import { meshTermsStanding } from "@/features/mesh/model";
import { meshRepository } from "@/features/mesh/repository";
import { useMeshTerms } from "@/features/terms/use-mesh-terms";
import { useAccountTermsStanding } from "@/features/terms/use-account-terms-standing";
import { routes } from "@/router";
import { RouterButtonLink } from "@/components/router-button-link";

/**
 * Across the console: meshes of the owner's that stopped storing data because
 * their terms lapsed (to the meshes list), or account terms that changed (to Profile).
 */
export function TermsBanner(): ReactElement | null {
  const { formatMessage } = useIntl();
  const { me } = useMe();
  const account = useAccountTermsStanding();
  // Nothing lapses on an instance that asks for no terms.
  const { enforced, current } = useMeshTerms();
  const owned = useQuery({
    ...meshRepository.list({ owned: true }),
    enabled: me !== undefined && enforced,
  });
  const now = new Date();
  const lapsed = (enforced ? (owned.data ?? []) : []).filter(
    (mesh) => meshTermsStanding(mesh, current?.version, now) === "lapsed",
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
      className="mb-6 flex flex-wrap items-center justify-between gap-3 oa-squircle bg-background-secondary-default px-4 py-3 shadow-card"
    >
      <p className="text-body-regular text-text-primary">{shown.message}</p>
      <RouterButtonLink to={shown.href} size="small">
        {shown.action}
      </RouterButtonLink>
    </div>
  );
}
