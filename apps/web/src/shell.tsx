import { ownersLogoutCreateMutation, ownersMeRetrieveOptions, ownersMeRetrieveQueryKey } from "@mtt/contracts/query";
import { Button, ButtonLink } from "@mtt/ui/components/base/buttons/button";
import { cx } from "@mtt/ui/utils";
import { getTheme, toggleTheme } from "@mtt/ui/theme";
import { RiCloseLine, RiGithubLine, RiLinkedinLine, RiMenuLine, RiMoonLine, RiSunLine } from "@remixicon/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Navigate, Outlet, useNavigate } from "@tanstack/react-router";
import { type ReactElement, type ReactNode, useState, useSyncExternalStore } from "react";

const SITE = "https://sensical.es";
const pageWidth = "mx-auto w-full min-w-0 max-w-6xl px-4 sm:px-6";

const socials = [
  { href: "https://github.com/sensical-coop/", label: "GitHub", icon: RiGithubLine },
  {
    href: "https://www.linkedin.com/company/sensical-sccl/",
    label: "LinkedIn",
    icon: RiLinkedinLine,
  },
] as const;

const footerLinkClass =
  "rounded-full text-body-medium text-text-secondary outline-none hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring";

const headerLinkClass =
  "rounded-full px-3 py-1 text-body-medium text-text-secondary outline-none hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring";

function subscribeTheme(onStoreChange: () => void): () => void {
  globalThis.addEventListener("boardui-theme", onStoreChange);
  return () => globalThis.removeEventListener("boardui-theme", onStoreChange);
}

function BrandMark({ className }: { className?: string }): ReactElement {
  return (
    <>
      <img src="/brand/snscl-b-t.svg" alt="" className={cx("w-auto dark:hidden", className ?? "h-3")} aria-hidden />
      <img src="/brand/snscl-w-t.svg" alt="" className={cx("hidden w-auto dark:block", className ?? "h-3")} aria-hidden />
    </>
  );
}

function FooterColumn({ title, children }: { title: string; children: ReactNode }): ReactElement {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-caption-1-medium uppercase tracking-[0.12em] text-text-tertiary">{title}</p>
      {children}
    </div>
  );
}

function NavLinks({
  onNavigate,
  stacked,
}: {
  onNavigate?: () => void;
  stacked?: boolean;
}): ReactElement {
  const linkClass = stacked
    ? cx(headerLinkClass, "block w-full px-3 py-2")
    : headerLinkClass;
  const activeClass = stacked
    ? cx(headerLinkClass, "block w-full bg-background-secondary-default px-3 py-2 text-text-primary")
    : cx(headerLinkClass, "bg-background-secondary-default text-text-primary");

  return (
    <>
      <Link
        to="/meshes"
        activeOptions={{ exact: true }}
        className={linkClass}
        activeProps={{ className: activeClass }}
        onClick={onNavigate}
      >
        Meshes
      </Link>
      <Link
        to="/devices"
        className={linkClass}
        activeProps={{ className: activeClass }}
        onClick={onNavigate}
      >
        Devices
      </Link>
      <Link
        to="/blueprints"
        className={linkClass}
        activeProps={{ className: activeClass }}
        onClick={onNavigate}
      >
        Blueprints
      </Link>
    </>
  );
}

export function Shell(): ReactElement {
  const theme = useSyncExternalStore(subscribeTheme, getTheme, getTheme);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const me = useQuery({ ...ownersMeRetrieveOptions(), retry: false });
  const logout = useMutation({
    ...ownersLogoutCreateMutation(),
    onSuccess: async () => {
      setMenuOpen(false);
      await queryClient.invalidateQueries({ queryKey: ownersMeRetrieveQueryKey() });
      await navigate({ to: "/login" });
    },
  });

  if (me.isPending) {
    return <div className="min-h-svh bg-background-full" />;
  }
  if (me.error) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="flex min-h-svh min-w-0 flex-col bg-background-full">
      <header className="fixed inset-x-0 top-0 z-10 bg-background-full pt-[env(safe-area-inset-top)]">
        <div className={cx(pageWidth, "flex h-14 items-center justify-between gap-3")}>
          <div className="flex min-w-0 items-center gap-4">
            <Link
              to="/meshes"
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
      <main className={cx(pageWidth, "flex-1 pt-[calc(5.5rem+env(safe-area-inset-top))] pb-16 sm:pb-24")}>
        <Outlet />
      </main>
      <footer className={cx(pageWidth, "mt-auto flex flex-col gap-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:pb-[max(2.5rem,env(safe-area-inset-bottom))]")}>
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between sm:gap-16">
          <div className="flex max-w-sm flex-col gap-3">
            <a
              href={SITE}
              aria-label="Sensical"
              className="w-fit rounded-full outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
            >
              <BrandMark className="h-3.5" />
            </a>
            <p className="text-body-regular text-text-secondary">
              Mesh telemetry for operators. Built by Sensical SCCL in Barcelona.
            </p>
          </div>
          <div className="flex flex-wrap gap-10">
            <FooterColumn title="Product">
              <nav aria-label="Product" className="flex flex-col gap-2">
                <Link to="/meshes" className={footerLinkClass}>
                  Meshes
                </Link>
                <Link to="/devices" className={footerLinkClass}>
                  Devices
                </Link>
                <Link to="/blueprints" className={footerLinkClass}>
                  Blueprints
                </Link>
              </nav>
            </FooterColumn>
            <FooterColumn title="Sensical">
              <nav aria-label="Sensical" className="flex flex-col gap-2">
                <a href={SITE} className={footerLinkClass}>
                  Website
                </a>
                <a href={`${SITE}/contact`} className={footerLinkClass}>
                  Contact
                </a>
              </nav>
            </FooterColumn>
          </div>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-caption-1-medium text-text-tertiary">© 2026 Sensical SCCL</p>
          <ul className="flex gap-2">
            {socials.map((social) => (
              <li key={social.href}>
                <ButtonLink
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  variant="secondary"
                  size="small"
                  iconOnly
                  leadingIcon={social.icon}
                  aria-label={social.label}
                  className="rounded-full"
                />
              </li>
            ))}
          </ul>
        </div>
      </footer>
    </div>
  );
}
