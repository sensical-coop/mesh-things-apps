import { Button } from "@mtt/ui/components/base/buttons/button";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { entityTermsStanding, type TermsEntity } from "@/features/terms/model";
import { TermsStandingChip } from "@/features/terms/ui/terms-standing-chip";
import { useFormatters } from "@/hooks/use-formatters";

export type TermsCellProps = {
  entity: TermsEntity;
  currentVersion: string | undefined;
  /** Only the operator who created a source or sink accepts its terms. */
  canRenew: boolean;
  onRenew: () => void;
};

export function TermsCell({ entity, currentVersion, canRenew, onRenew }: TermsCellProps): ReactElement {
  const { formatMessage } = useIntl();
  const { formatWhen } = useFormatters();
  const standing = entityTermsStanding(entity, currentVersion, new Date());
  return (
    <span className="flex items-center gap-2">
      <span className="text-text-secondary">
        {entity.terms_expires_at
          ? formatMessage(
              { id: "feature.terms.until", defaultMessage: "Until {when}" },
              { when: formatWhen(entity.terms_expires_at) },
            )
          : formatMessage({ id: "feature.terms.noLimit", defaultMessage: "No time limit" })}
      </span>
      <TermsStandingChip standing={standing} />
      {standing !== "ok" && canRenew ? (
        <Button type="button" size="xs" variant="secondary" onClick={onRenew}>
          {formatMessage({ id: "feature.terms.renew", defaultMessage: "Renew" })}
        </Button>
      ) : null}
    </span>
  );
}
