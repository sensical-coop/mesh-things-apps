import { BrandMark } from "@mtt/ui/components/brand-mark";
import { LanguageSwitcher } from "@mtt/ui/components/language-switcher";
import { ThemeToggle } from "@mtt/ui/components/theme-toggle";
import { cn } from "@mtt/ui/utils";
import { Link } from "@tanstack/react-router";
import { type ReactElement, type ReactNode, useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { RouterButtonLink } from "@/components/router-button-link";
import { routes } from "@/router";

export const siteHeaderLinkClass =
  "rounded-full text-body-medium text-text-secondary outline-hidden hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring";

export function SiteHeader({ nav }: { nav?: ReactNode }): ReactElement {
  const { formatMessage } = useIntl();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header data-scrolled={scrolled} className="group sticky top-0 z-sticky h-16 w-full px-4 sm:h-20 sm:px-6">
      <div className="relative mx-auto flex h-14 w-full max-w-full items-center justify-between px-0 sm:h-16 sm:max-w-4xl sm:px-4">
        <div className="relative z-10 flex items-center gap-7">
          <Link
            to={routes.home}
            aria-label="Sensical"
            className="shrink-0 rounded-full outline-hidden focus-visible:ring-2 focus-visible:ring-border-focus-ring"
          >
            <BrandMark />
          </Link>
          {nav ? (
            <nav aria-label="Main" className="hidden items-center gap-7 md:flex">
              {nav}
            </nav>
          ) : null}
        </div>
        <div className="relative z-10 flex items-center gap-2">
          <a href={routes.docs} className={cn(siteHeaderLinkClass, "p-2")}>
            {formatMessage({ id: "common.navigation.docs", defaultMessage: "Docs" })}
          </a>
          <LanguageSwitcher />
          <ThemeToggle />
          <RouterButtonLink to={routes.login} size="small">
            {formatMessage({ id: "page.home.header.signIn", defaultMessage: "Sign in" })}
          </RouterButtonLink>
        </div>
      </div>
    </header>
  );
}
