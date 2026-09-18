import { cx } from "@mtt/ui/utils";
import { type ReactElement, type ReactNode, useEffect, useRef } from "react";

export function LandingReveal({
  children,
  delayMs = 0,
  className,
}: {
  children: ReactNode;
  delayMs?: number;
  className?: string;
}): ReactElement {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        el.classList.add("is-inview");
        observer.disconnect();
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={cx("oa-reveal", className)} style={{ transitionDelay: `${delayMs}ms` }}>
      {children}
    </div>
  );
}
