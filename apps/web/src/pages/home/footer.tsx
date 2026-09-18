import { BrandMark, SITE } from "@/components/brand";
import { routes } from "@/router";
import { Link } from "@tanstack/react-router";
import { type ReactElement } from "react";

const linkClass =
  "rounded-full text-body-medium text-text-secondary outline-none hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring";

export function LandingFooter(): ReactElement {
  return (
    <footer className="mx-auto w-full max-w-[76rem] px-4 pb-12 sm:px-6 sm:pb-20">
      <div className="flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex max-w-sm flex-col gap-3">
          <a
            href={SITE}
            aria-label="Sensical"
            className="w-fit rounded-full outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
          >
            <BrandMark className="h-3.5" />
          </a>
          <p className="text-body-regular text-text-secondary">
            Storage and a console for Meshtastic networks. Built by Sensical SCCL in Barcelona.
          </p>
        </div>
        <nav aria-label="Landing" className="flex flex-wrap gap-x-10 gap-y-6">
          <div className="flex flex-col gap-2">
            <p className="text-caption-1-medium uppercase tracking-[0.12em] text-text-tertiary">Product</p>
            <a href="#why" className={linkClass}>
              How it works
            </a>
            <a href="#features" className={linkClass}>
              Features
            </a>
            <a href="#faq" className={linkClass}>
              FAQ
            </a>
            <Link to={routes.login} className={linkClass}>
              Sign in
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-caption-1-medium uppercase tracking-[0.12em] text-text-tertiary">Sensical</p>
            <a href={SITE} className={linkClass}>
              Website
            </a>
            <a href={`${SITE}/contact`} className={linkClass}>
              Contact
            </a>
          </div>
        </nav>
      </div>
      <p className="mt-10 text-caption-1-medium text-text-tertiary">© 2026 Sensical SCCL</p>
    </footer>
  );
}
