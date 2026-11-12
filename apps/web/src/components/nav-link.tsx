import { cx } from "@mtt/ui/utils";
import { Link } from "@tanstack/react-router";
import { type ReactElement, type ReactNode } from "react";
import { siteLinkClass } from "@/components/brand";

const baseClass = cx(siteLinkClass, "px-3 py-1");

/** The header's link style. `stacked` is the mobile menu's full-width row. */
export function navLinkClass({ stacked, active }: { stacked?: boolean; active?: boolean }): string {
  return cx(baseClass, stacked && "block w-full px-3 py-2", active && "bg-background-secondary-default text-text-primary");
}

export type NavLinkProps = {
  to: string;
  exact?: boolean;
  stacked?: boolean;
  className?: string;
  onNavigate?: () => void;
  children: ReactNode;
};

export function NavLink({ to, exact, stacked, className, onNavigate, children }: NavLinkProps): ReactElement {
  return (
    <Link
      to={to}
      activeOptions={exact ? { exact: true } : undefined}
      className={cx(navLinkClass({ stacked }), className)}
      activeProps={{ className: cx(navLinkClass({ stacked, active: true }), className) }}
      onClick={onNavigate}
    >
      {children}
    </Link>
  );
}
