import { type ReactElement, type ReactNode } from "react";

export function FooterColumn({ title, children }: { title: string; children: ReactNode }): ReactElement {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-caption-1-medium tracking-label text-text-tertiary uppercase">{title}</p>
      {children}
    </div>
  );
}
