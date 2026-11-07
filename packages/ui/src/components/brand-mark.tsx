import { cx } from "@mtt/ui/utils";
import type { ReactElement } from "react";
import markOnLight from "../assets/brand/snscl-b-t.svg";
import markOnDark from "../assets/brand/snscl-w-t.svg";

export function BrandMark({ className }: { className?: string }): ReactElement {
  return (
    <>
      <img src={markOnLight} alt="" className={cx("w-auto dark:hidden", className ?? "h-3")} aria-hidden />
      <img src={markOnDark} alt="" className={cx("hidden w-auto dark:block", className ?? "h-3")} aria-hidden />
    </>
  );
}
