import { authRepository } from "@/features/auth/repository";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { cx } from "@mtt/ui/utils";
import { toggleTheme } from "@mtt/ui/theme";
import { RiCloseLine, RiMenuLine, RiMoonLine, RiSunLine, RiUserLine } from "@remixicon/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { type ReactElement, useState } from "react";
import { useIntl } from "react-intl";
import { BrandMark, pageWidth } from "@/components/brand";
import { LanguageSwitcher } from "@/components/language-switcher";
import { routes } from "@/router";
import { useMe } from "@/features/auth/use-me";
import { AutomationMenu } from "@/components/automation-menu";
import { DataMenu } from "@/components/data-menu";
import { ManagementMenu } from "@/components/management-menu";
import { RouterButtonLink } from "@/components/router-button-link";
import { useTheme } from "@/hooks/use-theme";

const headerLinkClass =
  "rounded-full px-3 py-1 text-body-medium text-text-secondary outline-none hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring";

function NavLinks({
  onNavigate,
  stacked,
}: {
  onNavigate?: () => void;
  stacked?: boolean;
}): ReactElement {
  const { formatMessage } = useIntl();
  const { isOperator, isSuperuser } = useMe();
  const linkClass = stacked ? cx(headerLinkClass, "block w-full px-3 py-2") : headerLinkClass;
  const activeClass = stacked
    ? cx(headerLinkClass, "block w-full bg-background-secondary-default px-3 py-2 text-text-primary")
    : cx(headerLinkClass, "bg-background-secondary-default text-text-primary");

  return (
    <>
      <Link
        to={routes.meshes}
        activeOptions={{ exact: true }}
        className={linkClass}
        activeProps={{ className: activeClass }}
        onClick={onNavigate}
      >
        {formatMessage({ id: "console.footer.meshes", defaultMessage: "Meshes" })}
      </Link>
      <Link
        to={routes.devices}
        className={linkClass}
        activeProps={{ className: activeClass }}
        onClick={onNavigate}
      >
        {formatMessage({ id: "console.footer.devices", defaultMessage: "Devices" })}
      </Link>
      <AutomationMenu stacked={stacked} onNavigate={onNavigate} linkClass={linkClass} activeClass={activeClass} />
      <DataMenu
        stacked={stacked}
        onNavigate={onNavigate}
        linkClass={linkClass}
        activeClass={activeClass}
        isOperator={isOperator}
      />
      {isSuperuser ? (
        <ManagementMenu
          stacked={stacked}
          onNavigate={onNavigate}
          linkClass={linkClass}
          activeClass={activeClass}
        />
      ) : null}
    </>
  );
}

export function Header(): ReactElement {
  const { formatMessage } = useIntl();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const logout = useMutation({
    ...authRepository.logout(),
    onSuccess: async () => {
      setMenuOpen(false);
      queryClient.clear();
      await navigate({ to: routes.login });
    },
  });

  return (
    <header className="fixed inset-x-0 top-0 z-10 bg-background-full pt-[env(safe-area-inset-top)]">
      <div className={cx(pageWidth, "flex h-14 items-center justify-between gap-3")}>
        <div className="flex min-w-0 items-center gap-4">
          <Link
            to={routes.meshes}
            aria-label="Sensical"
            className="shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
            onClick={() => setMenuOpen(false)}
          >
            <BrandMark />
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
            <NavLinks />
          </nav>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            className={cx(headerLinkClass, "hidden md:inline")}
            onClick={() => logout.mutate({})}
          >
            {formatMessage({ id: "console.header.signOut", defaultMessage: "Sign out" })}
          </button>
          <LanguageSwitcher />
          <RouterButtonLink
            to={routes.profile}
            variant="secondary"
            size="small"
            iconOnly
            leadingIcon={RiUserLine}
            aria-label={formatMessage({ id: "console.header.profile", defaultMessage: "Profile" })}
            onClick={() => setMenuOpen(false)}
          />
          <Button
            type="button"
            variant="secondary"
            size="small"
            iconOnly
            leadingIcon={theme === "dark" ? RiSunLine : RiMoonLine}
            aria-label={formatMessage({ id: "common.themeToggle.label", defaultMessage: "Toggle color theme" })}
            onClick={() => {
              toggleTheme();
            }}
          />
          <Button
            type="button"
            variant="secondary"
            size="small"
            iconOnly
            className="md:hidden"
            leadingIcon={menuOpen ? RiCloseLine : RiMenuLine}
            aria-label={
              menuOpen
                ? formatMessage({ id: "console.header.closeMenu", defaultMessage: "Close menu" })
                : formatMessage({ id: "console.header.openMenu", defaultMessage: "Open menu" })
            }
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            onClick={() => setMenuOpen((open) => !open)}
          />
        </div>
      </div>
      {menuOpen ? (
        <div id="mobile-nav" className={cx(pageWidth, "flex flex-col gap-1 pb-4 md:hidden")}>
          <nav className="flex flex-col gap-1" aria-label="Primary">
            <NavLinks stacked onNavigate={() => setMenuOpen(false)} />
          </nav>
          <button
            type="button"
            className={cx(headerLinkClass, "w-full px-3 py-2 text-start")}
            onClick={() => logout.mutate({})}
          >
            {formatMessage({ id: "console.header.signOut", defaultMessage: "Sign out" })}
          </button>
        </div>
      ) : null}
    </header>
  );
}
