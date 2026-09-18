import { Chip } from "@mtt/ui/components/base/badges/chip";
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@mtt/ui/reui/frame";
import { RiLineChartLine, RiListCheck3, RiRouterLine } from "@remixicon/react";
import { type ReactElement } from "react";
import { LandingPacketFeed } from "./packet-feed";
import { LandingReveal } from "./reveal";

const gateways = [
  { name: "Barcelona gateway", state: "Allowed", color: "lime" },
  { name: "Madrid gateway", state: "Allowed", color: "lime" },
  { name: "Valencia node", state: "Node", color: "soft" },
  { name: "Field kit", state: "Blocked", color: "rose" },
] as const;

const bars = [40, 55, 48, 62, 70, 64, 80, 72, 68, 74, 90, 84] as const;

export function LandingFeatures(): ReactElement {
  return (
    <section id="features" className="scroll-mt-24">
      <LandingReveal>
        <h2 className="mx-auto max-w-2xl text-balance text-center text-title-1-medium tracking-tight text-text-primary sm:text-display-3-medium">
          Know the mesh, the gateways,{" "}
          <span className="text-text-secondary">and the channels they carry.</span>
        </h2>
      </LandingReveal>
      <LandingReveal className="mt-12 sm:mt-16">
        <ul className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          <li>
            <Frame className="h-full shadow-card">
              <FrameHeader>
                <FrameTitle>
                  <RiListCheck3 />
                  Realtime inventory
                </FrameTitle>
                <FrameDescription>Last seen, role and readings next to the mesh they belong to.</FrameDescription>
              </FrameHeader>
              <FramePanel className="h-44 overflow-hidden p-0 [mask-image:linear-gradient(to_bottom,#000_72%,transparent)]">
                <LandingPacketFeed />
              </FramePanel>
            </Frame>
          </li>
          <li>
            <Frame className="h-full shadow-card">
              <FrameHeader>
                <FrameTitle>
                  <RiRouterLine />
                  Gateways you allow
                </FrameTitle>
                <FrameDescription>A registered gateway is permission to decode.</FrameDescription>
              </FrameHeader>
              <FramePanel className="flex h-44 flex-col justify-center p-0">
                <ul className="flex flex-col" aria-hidden>
                  {gateways.map((row) => (
                    <li key={row.name} className="flex h-8 items-center justify-between gap-3 px-3">
                      <span className="min-w-0 truncate text-body-medium text-text-primary">{row.name}</span>
                      <Chip variant="caption" color={row.color} className="rounded-full">
                        {row.state}
                      </Chip>
                    </li>
                  ))}
                </ul>
              </FramePanel>
            </Frame>
          </li>
          <li>
            <Frame className="h-full shadow-card">
              <FrameHeader>
                <FrameTitle>
                  <RiLineChartLine />
                  Channels and charts
                </FrameTitle>
                <FrameDescription>Pick a channel, a window and an aggregation.</FrameDescription>
              </FrameHeader>
              <FramePanel className="flex h-44 flex-col justify-end gap-3">
                <p className="font-mono text-title-1-medium tabular-nums tracking-tight text-text-primary">22.4 °C</p>
                <p className="text-caption-1-regular text-text-tertiary">temperature · last 24 hours · avg</p>
                <div className="flex h-16 items-end gap-1" aria-hidden>
                  {bars.map((h, i) => (
                    <span
                      key={`${h}-${i}`}
                      className="min-w-0 flex-1 rounded-sm bg-accent-500/80"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </FramePanel>
            </Frame>
          </li>
        </ul>
      </LandingReveal>
    </section>
  );
}
