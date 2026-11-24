import { Chip } from "@mtt/ui/components/base/badges/chip";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";

export function ComputedFlag(): ReactElement {
  const { formatMessage } = useIntl();
  return (
    <Chip variant="caption" color="purple" className="shrink-0 rounded-full">
      {formatMessage({ id: "common.computedFlag", defaultMessage: "Computed" })}
    </Chip>
  );
}
