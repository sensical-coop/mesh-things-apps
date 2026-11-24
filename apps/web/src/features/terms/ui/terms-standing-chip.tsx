import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { StatusChip } from "@/components/status-chip";
import type { TermsStanding } from "@/features/terms/model";

export type TermsStandingChipProps = {
  standing: TermsStanding;
};

export function TermsStandingChip({ standing }: TermsStandingChipProps): ReactElement | null {
  const { formatMessage } = useIntl();
  if (standing === "ok") return null;
  const shown = {
    expiring: {
      tone: "yellow",
      label: formatMessage({ id: "feature.terms.standing.expiring", defaultMessage: "Renew soon" }),
    },
    outdated: {
      tone: "yellow",
      label: formatMessage({ id: "feature.terms.standing.outdated", defaultMessage: "Terms changed" }),
    },
    none: {
      tone: "neutral",
      label: formatMessage({ id: "feature.terms.standing.none", defaultMessage: "Not accepted" }),
    },
    lapsed: {
      tone: "rose",
      label: formatMessage({ id: "feature.terms.standing.lapsed", defaultMessage: "Lapsed" }),
    },
  } as const;
  return <StatusChip tone={shown[standing].tone} label={shown[standing].label} />;
}
