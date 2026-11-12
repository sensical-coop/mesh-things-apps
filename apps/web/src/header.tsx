import { useLogout } from "@mtt/contracts/session";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { BrandMark } from "@mtt/ui/components/brand-mark";
import { ThemeToggle } from "@mtt/ui/components/theme-toggle";
import { cx } from "@mtt/ui/utils";
import { RiCloseLine, RiMenuLine, RiUserLine } from "@remixicon/react";
import { Link, useNavigate } from "@tanstack/react-router";
import { type ReactElement, useState } from "react";
import { useIntl } from "react-intl";
import { pageWidth } from "@/components/brand";
import { LanguageSwitcher } from "@mtt/ui/components/language-switcher";
import { RouterButtonLink } from "@/components/router-button-link";
import { navLinkClass } from "@/components/nav-link";
import { NavLinks } from "@/nav-links";
import { routes } from "@/router";

export function Header(): ReactElement {
  const { formatMessage } = useIntl();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const { logout } = useLogout(async () => {
    setMenuOpen(false);
    await navigate({ to: routes.login });
  });

  const signOutButton = (className: string) => (
    <button type="button" className={className} onClick={logout}>
      {formatMessage({ id: "console.header.signOut", defaultMessage: "Sign out" })}
    </button>
  );

  return (
    <header className="fixed inset-x-0 top-0 z-sticky bg-background-full pt-[env(safe-area-inset-top)]">
      <div className={cx(pageWidth, "flex h-14 items-center justify-between gap-3")}>
        <div className="flex min-w-0 items-center gap-4">
          <Link
            to={routes.meshes}
            aria-label="Sensical"
            className="shrink-0 rounded-full outline-hidden focus-visible:ring-2 focus-visible:ring-border-focus-ring"
            onClick={() => setMenuOpen(false)}
          >
            <BrandMark />
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
            <NavLinks />
          </nav>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {signOutButton(cx(navLinkClass({}), "hidden md:inline"))}
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
          <ThemeToggle />
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
          {signOutButton(cx(navLinkClass({ stacked: true }), "text-start"))}
        </div>
      ) : null}
    </header>
  );
}
