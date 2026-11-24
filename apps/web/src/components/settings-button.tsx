import { Button } from "@mtt/ui/components/base/buttons/button";
import { RiSettings3Line } from "@remixicon/react";
import { type ReactElement } from "react";

export type SettingsButtonProps = {
  label: string;
  onClick: () => void;
  size?: "small" | "xs";
  className?: string;
};

export function SettingsButton({ label, onClick, size = "xs", className }: SettingsButtonProps): ReactElement {
  return (
    <Button
      type="button"
      size={size}
      variant="secondary"
      iconOnly
      leadingIcon={RiSettings3Line}
      aria-label={label}
      title={label}
      className={className}
      onClick={onClick}
    />
  );
}
