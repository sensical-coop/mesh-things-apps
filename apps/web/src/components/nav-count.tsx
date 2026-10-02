import { type ReactElement } from "react";

export type NavCountProps = {
  count: number;
  /** Read by screen readers after the link text, e.g. "2 waiting". */
  label: string;
};

/** A small count after a header link; nothing when it is zero. */
export function NavCount({ count, label }: NavCountProps): ReactElement | null {
  if (count <= 0) return null;
  return (
    <span className="ms-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-accent-500 px-1.5 text-caption-1-medium tabular-nums text-white">
      <span aria-hidden>{count}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}
