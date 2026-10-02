import { Button } from "@mtt/ui/components/base/buttons/button";
import { RiSettings3Line } from "@remixicon/react";
import { type ReactElement } from "react";

export type SettingsButtonProps = {
  /** What it edits, e.g. "Edit mesh": the accessible name and the tooltip. */
  label: string;
  onClick: () => void;
  /** `small` beside a page title, `xs` in a table row. */
  size?: "small" | "xs";
  className?: string;
};

/** The one way to open an item's settings, everywhere: a cog, named by its label. */
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
