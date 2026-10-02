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

export type NavMenuItem = {
  to: string;
  label: string;
  /** One line under the label, in the dropdown and the mobile menu. */
  description?: string;
  count?: number;
  countLabel?: string;
};

export type NavMenuProps = {
  title: string;
  items: readonly NavMenuItem[];
  /** Screen-reader text for the trigger's total count, e.g. "3 need attention". */
  totalCountLabel?: (total: number) => string;
  /** The mobile menu: a heading and its links, as a dropdown inside a menu is awkward to use. */
  stacked?: boolean;
  onNavigate?: () => void;
  linkClass: string;
  activeClass: string;
};

/**
 * A header entry that groups pages: a dropdown on desktop, a heading with its links on
 * mobile. Highlighted while on any of its pages; counts sum on the trigger.
 */
export function NavMenu({
  title,
  items,
  totalCountLabel,
  stacked,
  onNavigate,
  linkClass,
  activeClass,
}: NavMenuProps): ReactElement {
  const matchRoute = useMatchRoute();
  const onOneOfItsPages = items.some((item) => matchRoute({ to: item.to, fuzzy: true }) !== false);
  const total = items.reduce((sum, item) => sum + (item.count ?? 0), 0);

  if (stacked) {
    return (
      <div className="flex flex-col">
        <p className="px-3 pt-3 pb-1 text-caption-1-medium text-text-tertiary">{title}</p>
        {items.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={cx(linkClass, "ps-5")}
            activeProps={{ className: cx(activeClass, "ps-5") }}
            onClick={onNavigate}
          >
            {item.label}
            {item.count !== undefined ? <NavCount count={item.count} label={item.countLabel ?? ""} /> : null}
          </Link>
        ))}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button type="button" className={cx(onOneOfItsPages ? activeClass : linkClass, "inline-flex items-center")} />
        }
      >
        {title}
        {totalCountLabel ? <NavCount count={total} label={totalCountLabel(total)} /> : null}
        <RiArrowDownSLine aria-hidden className="ms-0.5 size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-auto min-w-(--anchor-width)">
        {items.map((item) => (
          <DropdownMenuItem
            key={item.to}
            render={<Link to={item.to} />}
            className="items-start justify-between gap-4 whitespace-nowrap"
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
