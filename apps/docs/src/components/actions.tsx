import { LanguageSwitcher } from "@mtt/ui/components/language-switcher";
import { ThemeToggle } from "@mtt/ui/components/theme-toggle";
import { cx } from "@mtt/ui/utils";
import type { ComponentProps } from "react";

export type DocumentationActionsProps = ComponentProps<"div">;

export function DocumentationActions({ className, ...props }: DocumentationActionsProps) {
  return (
    <div {...props} className={cx("flex items-center gap-2", className)}>
      <LanguageSwitcher />
      <ThemeToggle />
    </div>
  );
}
