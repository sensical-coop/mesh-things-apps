import { Button } from "@mtt/ui/components/base/buttons/button";
import { useTheme } from "@mtt/ui/hooks/use-theme";
import { toggleTheme } from "@mtt/ui/theme";
import { RiMoonLine, RiSunLine } from "@remixicon/react";
import type { ReactElement } from "react";
import { useIntl } from "react-intl";

export function ThemeToggle({ className }: { className?: string }): ReactElement {
  const theme = useTheme();
  const { formatMessage } = useIntl();
  return (
    <Button
      type="button"
      variant="secondary"
      size="small"
      iconOnly
      className={className}
      leadingIcon={theme === "dark" ? RiSunLine : RiMoonLine}
      aria-label={formatMessage({ id: "common.themeToggle.label", defaultMessage: "Toggle color theme" })}
      onClick={toggleTheme}
    />
  );
}
