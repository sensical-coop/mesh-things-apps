import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@mtt/ui/reui/frame";
import { type ReactElement } from "react";
import { LandingPacketFeed } from "./packet-feed";
import { LandingReveal } from "./reveal";

const channels = [
  { name: "temperature", value: "412", fill: "100%" },
  { name: "humidity", value: "268", fill: "65%" },
  { name: "position", value: "194", fill: "47%" },
  { name: "battery", value: "122", fill: "30%" },
] as const;

export function LandingSteps(): ReactElement {
  return (
    <section id="why" className="scroll-mt-24">
      <LandingReveal>
        <h2 className="mx-auto max-w-2xl text-balance text-center text-title-1-medium tracking-tight text-text-primary sm:text-display-3-medium">
          Three steps from a mesh to a chart,{" "}
          <span className="text-text-secondary">and the first one is a name.</span>
        </h2>
      </LandingReveal>
      <LandingReveal className="mt-12 sm:mt-16">
        <ul className="grid gap-4 sm:gap-6 lg:grid-cols-3">
          <li>
            <Frame className="h-full shadow-card">
              <FrameHeader>
                <FrameTitle>
                  <span className="font-mono text-caption-1-medium text-text-tertiary">01</span>
                  Register a mesh
                </FrameTitle>
                <FrameDescription>
                  Create a mesh, keep the PSK on the gateways, and the rest of the nodes join that radio network.
                </FrameDescription>
              </FrameHeader>
              <FramePanel className="flex h-44 flex-col justify-center font-mono text-caption-1-regular text-text-secondary">
                <p>mesh create west-med</p>
                <p className="mt-2 text-text-primary">created west-med</p>
                <p className="mt-2">psk stays on the gateway</p>
              </FramePanel>
            </Frame>
          </li>
          <li>
            <Frame className="h-full shadow-card">
              <FrameHeader>
                <FrameTitle>
                  <span className="font-mono text-caption-1-medium text-text-tertiary">02</span>
                  Packets land in storage
                </FrameTitle>
                <FrameDescription>
                  Allowed gateways decode traffic. Telemetry, position and nodeinfo are stored as they arrive.
                </FrameDescription>
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
                  <span className="font-mono text-caption-1-medium text-text-tertiary">03</span>
                  Read it back
                </FrameTitle>
                <FrameDescription>
                  Open a mesh, a device, or a channel series. The inventory is the live picture of the radio.
                </FrameDescription>
              </FrameHeader>
              <FramePanel className="flex h-44 flex-col justify-center gap-3" aria-hidden>
                {channels.map((channel) => (
                  <div key={channel.name} className="flex items-center gap-3">
                    <p className="w-24 shrink-0 truncate text-caption-1-medium text-text-primary">{channel.name}</p>
                    <div className="h-1.5 min-w-0 flex-1 rounded-full bg-background-tertiary-default">
                      <div className="h-full rounded-full bg-accent-500" style={{ width: channel.fill }} />
                    </div>
                    <p className="w-8 shrink-0 text-right font-mono text-caption-1-regular tabular-nums text-text-tertiary">
                      {channel.value}
                    </p>
                  </div>
                ))}
              </FramePanel>
            </Frame>
          </li>
        </ul>
      </LandingReveal>
    </section>
  );
}
