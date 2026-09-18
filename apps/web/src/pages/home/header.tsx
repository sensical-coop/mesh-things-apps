import { BrandMark } from "@/components/brand";
import { routes } from "@/router";
import { Button, ButtonLink } from "@mtt/ui/components/base/buttons/button";
import { getTheme, toggleTheme } from "@mtt/ui/theme";
import { RiMoonLine, RiSunLine } from "@remixicon/react";
import { Link } from "@tanstack/react-router";
import { type ReactElement, useEffect, useState, useSyncExternalStore } from "react";

const navLinkClass =
  "rounded-full text-body-medium text-text-secondary outline-none hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring";

function subscribeTheme(onStoreChange: () => void): () => void {
  globalThis.addEventListener("boardui-theme", onStoreChange);
  return () => globalThis.removeEventListener("boardui-theme", onStoreChange);
}

export function LandingHeader(): ReactElement {
  const theme = useSyncExternalStore(subscribeTheme, getTheme, getTheme);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header data-scrolled={scrolled} className="landing-header-morph group sticky top-0 z-50 h-16 w-full px-4 sm:h-20 sm:px-6">
      <div className="landing-header-pill relative mx-auto flex h-14 w-full max-w-full items-center justify-between px-0 sm:h-16 sm:max-w-4xl sm:px-4">
        <span aria-hidden className="glass-noise absolute inset-0 rounded-full" />
        <div className="relative z-10 flex items-center gap-7">
          <Link
            to={routes.home}
            aria-label="Sensical"
            className="shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
          >
            <BrandMark />
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-7 md:flex">
            <a href="#why" className={navLinkClass}>
              How it works
            </a>
            <a href="#features" className={navLinkClass}>
              Features
            </a>
            <a href="#faq" className={navLinkClass}>
              FAQ
            </a>
          </nav>
        </div>
        <div className="relative z-10 flex items-center gap-2">
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
          <ButtonLink href={routes.login} size="small">
            Sign in
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
