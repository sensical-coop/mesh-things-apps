import { Chip } from "@mtt/ui/components/base/badges/chip";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import type { TermsStanding } from "@/features/terms/model";

export type TermsStandingChipProps = {
  standing: TermsStanding;
};

/** Nothing when the terms are in order; otherwise why they need accepting again. */
export function TermsStandingChip({ standing }: TermsStandingChipProps): ReactElement | null {
  const { formatMessage } = useIntl();
  if (standing === "ok") return null;
  const shown = {
    expiring: {
      color: "yellow",
      label: formatMessage({ id: "feature.terms.standing.expiring", defaultMessage: "Renew soon" }),
    },
    outdated: {
      color: "yellow",
      label: formatMessage({ id: "feature.terms.standing.outdated", defaultMessage: "Terms changed" }),
    },
    none: {
      color: "neutral",
      label: formatMessage({ id: "feature.terms.standing.none", defaultMessage: "Not accepted" }),
    },
    lapsed: {
      color: "rose",
      label: formatMessage({ id: "feature.terms.standing.lapsed", defaultMessage: "Lapsed" }),
    },
  } as const;
  return (
    <Chip variant="caption" color={shown[standing].color} className="rounded-full">
      {shown[standing].label}
    </Chip>
  );
}
