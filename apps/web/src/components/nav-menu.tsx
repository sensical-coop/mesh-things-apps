import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@mtt/ui/components/ui/dropdown-menu";
import { cx } from "@mtt/ui/utils";
import { RiArrowDownSLine } from "@remixicon/react";
import { Link, useMatchRoute } from "@tanstack/react-router";
import { type ReactElement } from "react";
import { NavCount } from "@/components/nav-count";
import { NavLink, navLinkClass } from "@/components/nav-link";

export type NavMenuItem = {
  to: string;
  label: string;
  description?: string;
  count?: number;
  countLabel?: string;
};

export type NavMenuProps = {
  title: string;
  items: readonly NavMenuItem[];
  /** A count on the menu's own button, for menus whose items need attention. */
  badge?: { count: number; label: string };
  /** The mobile menu: a heading and its links, as a dropdown inside a menu is awkward to use. */
  stacked?: boolean;
  onNavigate?: () => void;
};

export function NavMenu({ title, items, badge, stacked, onNavigate }: NavMenuProps): ReactElement {
  const matchRoute = useMatchRoute();
  const onOneOfItsPages = items.some((item) => matchRoute({ to: item.to, fuzzy: true }) !== false);

  if (stacked) {
    return (
      <div className="flex flex-col">
        <p className="px-3 pt-3 pb-1 text-caption-1-medium text-text-tertiary">{title}</p>
        {items.map((item) => (
          <NavLink key={item.to} to={item.to} stacked className="ps-5" onNavigate={onNavigate}>
            {item.label}
            {item.count !== undefined ? <NavCount count={item.count} label={item.countLabel ?? ""} /> : null}
          </NavLink>
        ))}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button type="button" className={cx(navLinkClass({ active: onOneOfItsPages }), "inline-flex items-center")} />
        }
      >
        {title}
        {badge ? <NavCount count={badge.count} label={badge.label} /> : null}
        <RiArrowDownSLine aria-hidden className="ms-0.5 size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-auto min-w-(--anchor-width)">
        {items.map((item) => (
          <DropdownMenuItem
            key={item.to}
            render={<Link to={item.to} />}
            className="items-start justify-between gap-4 whitespace-nowrap transition-colors hover:bg-dropdown-item-hover-background focus:bg-dropdown-item-hover-background data-highlighted:bg-dropdown-item-hover-background"
          >
            <span className="flex flex-col">
              <span>{item.label}</span>
              {item.description ? (
                <span className="text-caption-1-regular text-text-tertiary">{item.description}</span>
              ) : null}
            </span>
            {item.count !== undefined ? <NavCount count={item.count} label={item.countLabel ?? ""} /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
