import { Blobatar } from "@blobatar/react";
import "blobatar/motion.css";
import type { ReactElement } from "react";

/** Pins the cloud silhouette; the theme accent paints the body in both themes. */
const CLOUD = { shape: 0.825 };
const ACCENT = { head: "var(--color-accent-500)" };

/** The Mesh Things blob that sits above a step's title. */
export function StepBlob(): ReactElement {
  return <Blobatar name="mesh-things" animate="always" traits={CLOUD} palette={ACCENT} size={64} className="-ms-1.5 -mb-2" />;
}
