import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ReactNode, useCallback, useState } from "react";
import { LAYOUT } from "../oa/springs";
import { cn } from "../utils";

export function MeasuredSteps({
  stepKey,
  direction,
  children,
  className,
}: {
  stepKey: string;
  direction: 1 | -1;
  children: ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const [height, setHeight] = useState<number | "auto">("auto");

  const measure = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.borderBoxSize?.[0];
      if (box) setHeight(box.blockSize);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <motion.div
      animate={{ height: reduced ? "auto" : height }}
      transition={reduced ? { duration: 0 } : LAYOUT}
      className={cn("relative overflow-hidden", className)}
    >
      <AnimatePresence custom={direction} initial={false} mode="popLayout">
        <motion.div
          key={stepKey}
          ref={measure}
          custom={direction}
          initial={reduced ? { opacity: 0 } : { opacity: 0, x: direction * 12 }}
          animate={reduced ? { opacity: 1 } : { opacity: 1, x: 0 }}
          exit={
            reduced
              ? { opacity: 0, transition: { duration: 0.1 } }
              : { opacity: 0, x: direction * -12, transition: { duration: 0.1 } }
          }
          transition={{ duration: reduced ? 0.1 : 0.16, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
