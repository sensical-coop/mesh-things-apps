import { Button } from "@mtt/ui/components/base/buttons/button";
import { toggleTheme } from "@mtt/ui/theme";
import { cx } from "@mtt/ui/utils";
import { RiMoonLine, RiSunLine } from "@remixicon/react";
import type { ComponentProps } from "react";
import { useIntl } from "react-intl";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useTheme } from "@/hooks/use-theme";

export type DocumentationActionsProps = ComponentProps<"div">;

export function DocumentationActions({ className, ...props }: DocumentationActionsProps) {
  const theme = useTheme();
  const { formatMessage } = useIntl();

  return (
    <div {...props} className={cx("flex items-center gap-2", className)}>
      <LanguageSwitcher />
      <Button
        variant="secondary"
        size="small"
        iconOnly
        leadingIcon={theme === "dark" ? RiSunLine : RiMoonLine}
        aria-label={formatMessage({ id: "common.themeToggle.label", defaultMessage: "Toggle color theme" })}
        onClick={toggleTheme}
      />
    </div>
  );
}
