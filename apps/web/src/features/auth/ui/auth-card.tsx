import { Frame, FramePanel } from "@mtt/ui/reui/frame";
import type { ReactElement, ReactNode } from "react";

export function AuthCard({
  title,
  subtitle,
  announceSubtitle = false,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  /** The subtitle is a status message, announced by screen readers. */
  announceSubtitle?: boolean;
  children: ReactNode;
}): ReactElement {
  return (
    <Frame className="w-full shadow-card" spacing="lg">
      <FramePanel className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-title-2-medium tracking-tight text-text-primary">{title}</h1>
          {subtitle ? (
            <p className="text-body-regular text-text-secondary" role={announceSubtitle ? "status" : undefined}>
              {subtitle}
            </p>
          ) : null}
        </div>
        {children}
      </FramePanel>
    </Frame>
  );
}
