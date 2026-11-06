import { cx } from "@mtt/ui/utils";
import type { ReactElement } from "react";

export function BrandMark({ className }: { className?: string }): ReactElement {
  return (
    <>
      <img src="/brand/snscl-b-t.svg" alt="" className={cx("w-auto dark:hidden", className ?? "h-3")} aria-hidden />
      <img src="/brand/snscl-w-t.svg" alt="" className={cx("hidden w-auto dark:block", className ?? "h-3")} aria-hidden />
    </>
  );
}
