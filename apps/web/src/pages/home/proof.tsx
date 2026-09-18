import { Chip } from "@mtt/ui/components/base/badges/chip";
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@mtt/ui/reui/frame";
import { RiEarthLine, RiLockLine, RiPulseLine } from "@remixicon/react";
import { type ReactElement } from "react";
import { LandingGlobe } from "./globe";
import { LandingPacketFeed } from "./packet-feed";
import { LandingReveal } from "./reveal";

const privacy = [
  { label: "This page", value: "No cookies", color: "lime" },
  { label: "Console", value: "Session after sign-in", color: "cyan" },
  { label: "Radio", value: "Stays LoRa", color: "soft" },
  { label: "Packets", value: "Stored here", color: "soft" },
] as const;

export function LandingProof({ className }: { className?: string }): ReactElement {
  return (
    <LandingReveal className={className}>
      <ul className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        <li>
          <Frame className="h-full shadow-card">
            <FrameHeader>
              <FrameTitle>
                <RiPulseLine />
                Packets
              </FrameTitle>
              <FrameDescription>Telemetry as it lands, with nothing to refresh.</FrameDescription>
            </FrameHeader>
            <FramePanel className="h-52 overflow-hidden p-0 [mask-image:linear-gradient(to_bottom,#000_72%,transparent)]">
              <LandingPacketFeed />
            </FramePanel>
          </Frame>
        </li>
        <li>
          <Frame className="h-full shadow-card">
            <FrameHeader>
              <FrameTitle>
                <RiEarthLine />
                Live globe
              </FrameTitle>
              <FrameDescription>Sample mesh over the western Mediterranean.</FrameDescription>
            </FrameHeader>
            <FramePanel className="h-52 overflow-hidden p-0">
              <LandingGlobe />
            </FramePanel>
          </Frame>
        </li>
        <li>
          <Frame className="h-full shadow-card">
            <FrameHeader>
              <FrameTitle>
                <RiLockLine />
                The radio stays LoRa
              </FrameTitle>
              <FrameDescription>Nowhere to click. Nothing to accept.</FrameDescription>
            </FrameHeader>
            <FramePanel className="flex h-52 flex-col justify-center p-0">
              <ul className="flex flex-col" aria-hidden>
                {privacy.map((row) => (
                  <li key={row.label} className="flex h-8 items-center justify-between gap-3 px-3">
                    <span className="text-body-medium text-text-primary">{row.label}</span>
                    <Chip variant="caption" color={row.color} className="rounded-full">
                      {row.value}
                    </Chip>
                  </li>
                ))}
              </ul>
            </FramePanel>
          </Frame>
        </li>
      </ul>
    </LandingReveal>
  );
}
