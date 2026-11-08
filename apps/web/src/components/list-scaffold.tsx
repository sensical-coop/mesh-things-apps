import { type ReactElement, type ReactNode } from "react";
import { Frame, FrameDescription, FrameHeader, FramePanel, FrameTitle } from "@mtt/ui/reui/frame";
import { SkeletonRows } from "@/components/skeleton-rows";
import { pageHeadingClass } from "@/lib/page-heading";

const titleClass = "min-w-0 text-title-2-medium tracking-tight text-text-primary";

export function ListScaffold({
  title,
  subtitle,
  actions,
  notice,
  panelTitle,
  panelDescription,
  toolbar,
  pending = false,
  failed = false,
  skeletonRows,
  panelClassName,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  notice?: ReactNode;
  panelTitle?: ReactNode;
  panelDescription?: ReactNode;
  toolbar?: ReactNode;
  pending?: boolean;
  failed?: boolean;
  skeletonRows?: number;
  panelClassName?: string;
  children?: ReactNode;
}): ReactElement {
  const frame =
    panelTitle != null ? (
      <Frame className="shadow-card">
        <FrameHeader>
          <FrameTitle>{panelTitle}</FrameTitle>
          {panelDescription != null ? <FrameDescription>{panelDescription}</FrameDescription> : null}
        </FrameHeader>
        <FramePanel className={panelClassName}>
          {toolbar}
          {pending ? <SkeletonRows rows={skeletonRows} /> : null}
          {pending || failed ? null : children}
        </FramePanel>
      </Frame>
    ) : (
      children
    );

  return (
    <>
      <div className={pageHeadingClass}>
        {subtitle ? (
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className={titleClass}>{title}</h1>
            <p className="max-w-2xl text-body-regular text-text-secondary">{subtitle}</p>
          </div>
        ) : (
          <h1 className={titleClass}>{title}</h1>
        )}
        {actions}
      </div>
      {notice ? (
        <div className="flex flex-col gap-6">
          {notice}
          {frame}
        </div>
      ) : (
        frame
      )}
    </>
  );
}
