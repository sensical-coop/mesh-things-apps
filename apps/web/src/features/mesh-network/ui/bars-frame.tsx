import { Frame, FrameDescription, FrameHeader, FramePanel, FrameTitle } from "@mtt/ui/reui/frame";
import { type ReactElement } from "react";
import { RankedBars, type RankedBar } from "./ranked-bars";

export function BarsFrame({
  title,
  description,
  rows,
}: {
  title: string;
  description: string;
  rows: RankedBar[];
}): ReactElement {
  return (
    <Frame className="shadow-card">
      <FrameHeader>
        <FrameTitle>{title}</FrameTitle>
        <FrameDescription>{description}</FrameDescription>
      </FrameHeader>
      <FramePanel>
        <RankedBars rows={rows} label={title} />
      </FramePanel>
    </Frame>
  );
}
