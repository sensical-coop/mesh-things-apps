import { Link } from "@tanstack/react-router";
import type { ReactElement } from "react";
import { BrandMark } from "@/components/brand";
import { LanguageSwitcher } from "@/components/language-switcher";
import { routes } from "@/router";

/**
 * Top bar for the standalone auth pages (login/signup)
 */
export function AuthHeader(): ReactElement {
  return (
    <header className="absolute inset-x-0 top-0 z-10 h-16 w-full px-4 pt-[env(safe-area-inset-top)] sm:h-20 sm:px-6">
      <div className="mx-auto flex h-14 w-full max-w-full items-center justify-between px-0 sm:h-16 sm:max-w-4xl sm:px-4">
        <Link
          to={routes.home}
          aria-label="Sensical"
          className="shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
        >
          <BrandMark />
        </Link>
        <LanguageSwitcher />
      </div>
    </header>
  );
}
