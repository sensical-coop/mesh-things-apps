import { Button } from "@mtt/ui/components/base/buttons/button";
import { getTheme, toggleTheme } from "@mtt/ui/theme";
import { cx } from "@mtt/ui/utils";
import { RiMoonLine, RiSunLine } from "@remixicon/react";
import { type ComponentProps, useSyncExternalStore } from "react";
import { useIntl } from "react-intl";
import { LanguageSwitcher } from "@/components/language-switcher";

export type DocumentationActionsProps = ComponentProps<"div">;

function subscribeTheme(onChange: () => void) {
  globalThis.addEventListener("boardui-theme", onChange);
  return () => globalThis.removeEventListener("boardui-theme", onChange);
}

export function DocumentationActions({ className, ...props }: DocumentationActionsProps) {
  const theme = useSyncExternalStore(subscribeTheme, getTheme, getTheme);
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
