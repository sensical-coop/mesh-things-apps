import { Button } from "@mtt/ui/components/base/buttons/button";
import { RiRefreshLine } from "@remixicon/react";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";

export type RequestAgainButtonProps = {
  size: "xs" | "small";
  disabled: boolean;
  title?: string;
  className?: string;
  onClick: () => void;
};

export function RequestAgainButton({ size, disabled, title, className, onClick }: RequestAgainButtonProps): ReactElement {
  const { formatMessage } = useIntl();
  return (
    <Button
      type="button"
      size={size}
      variant="secondary"
      leadingIcon={RiRefreshLine}
      className={className}
      disabled={disabled}
      title={title}
      onClick={onClick}
    >
      {formatMessage({ id: "feature.export.table.requestAgain", defaultMessage: "Request again" })}
    </Button>
  );
}
