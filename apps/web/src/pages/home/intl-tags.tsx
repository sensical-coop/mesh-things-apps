import type { ReactNode } from "react";

export const richTextValues = {
  secondary: (chunks: ReactNode) => <span className="text-text-secondary">{chunks}</span>,
  accent: (chunks: ReactNode) => <span className="text-accent-500">{chunks}</span>,
  highlight: (chunks: ReactNode) => (
    <span className="rounded-md bg-accent-500/10 px-1 py-0.5 text-accent-500">{chunks}</span>
  ),
};
