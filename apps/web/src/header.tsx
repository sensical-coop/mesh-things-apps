import { authRepository } from "@/features/auth/repository";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { cx } from "@mtt/ui/utils";
import { getTheme, toggleTheme } from "@mtt/ui/theme";
import { RiCloseLine, RiMenuLine, RiMoonLine, RiSunLine } from "@remixicon/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { type ReactElement, useState, useSyncExternalStore } from "react";
import { BrandMark, pageWidth } from "@/components/brand";
import { routes } from "@/router";

const headerLinkClass =
  "rounded-full px-3 py-1 text-body-medium text-text-secondary outline-none hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring";

function subscribeTheme(onStoreChange: () => void): () => void {
  globalThis.addEventListener("boardui-theme", onStoreChange);
  return () => globalThis.removeEventListener("boardui-theme", onStoreChange);
}

function NavLinks({
  onNavigate,
  stacked,
}: {
  onNavigate?: () => void;
  stacked?: boolean;
}): ReactElement {
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
        Meshes
      </Link>
      <Link
        to={routes.devices}
        className={linkClass}
        activeProps={{ className: activeClass }}
        onClick={onNavigate}
      >
        Devices
      </Link>
      <Link
        to={routes.blueprints}
        className={linkClass}
        activeProps={{ className: activeClass }}
        onClick={onNavigate}
      >
        Blueprints
      </Link>
    </>
  );
}

export function Header(): ReactElement {
  const theme = useSyncExternalStore(subscribeTheme, getTheme, getTheme);
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
            Sign out
          </button>
          <Button
            type="button"
            variant="secondary"
            size="small"
            iconOnly
            leadingIcon={theme === "dark" ? RiSunLine : RiMoonLine}
            aria-label="Toggle color theme"
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
            aria-label={menuOpen ? "Close menu" : "Open menu"}
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
            Sign out
          </button>
        </div>
      ) : null}
    </header>
  );
}
