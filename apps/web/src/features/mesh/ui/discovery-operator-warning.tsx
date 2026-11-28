import { RiErrorWarningLine } from "@remixicon/react";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";

/** Under the discovery checkbox while a non-operator turns it on with a default or blank PSK; saving is blocked. */
export function DiscoveryOperatorWarning(): ReactElement {
  const { formatMessage } = useIntl();
  return (
    <p role="alert" className="flex items-start gap-1.5 pl-7 text-caption-1-regular text-status-yellow-text">
      <RiErrorWarningLine className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      {formatMessage({
        id: "feature.mesh.discoveryOperatorWarning",
        defaultMessage: "Only operators can enable automatic discovery with default or blank PSK.",
      })}
    </p>
  );
}
