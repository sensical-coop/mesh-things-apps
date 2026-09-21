import { Link } from "@tanstack/react-router";
import type { ReactElement } from "react";
import { BrandMark } from "@/components/brand";
import { LanguageSwitcher } from "@/components/language-switcher";
import { routes } from "@/router";

/**
 * Top bar for the standalone auth pages (login/signup): brand mark back to
 * the landing page on one side, language on the other.
 */
export function AuthHeader(): ReactElement {
  return (
    <header className="absolute inset-x-0 top-0 z-10 w-full px-4 py-4 pt-[env(safe-area-inset-top)] sm:px-6 sm:py-6">
      <div className="mx-auto flex w-full max-w-full items-center justify-between sm:max-w-4xl">
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
