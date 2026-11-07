import { Blobatar } from "@blobatar/react";
import "blobatar/motion.css";
import type { ReactElement } from "react";

const CLOUD = { shape: 0.825 };
const ACCENT = { head: "var(--color-accent-500)" };

export function StepBlob(): ReactElement {
  return <Blobatar name="mesh-things" animate="always" traits={CLOUD} palette={ACCENT} size={64} className="-ms-1.5 -mb-2" />;
}
