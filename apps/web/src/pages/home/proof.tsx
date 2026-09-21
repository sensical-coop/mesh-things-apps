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
import { useIntl } from "react-intl";
import { LandingGlobe } from "./globe";
import { LandingPacketFeed } from "./packet-feed";
import { LandingReveal } from "./reveal";

const privacy = [
  {
    id: "page",
    labelId: "page.home.proof.privacy.page.label",
    labelDefault: "This page",
    valueId: "page.home.proof.privacy.page.value",
    valueDefault: "No cookies",
    color: "lime",
  },
  {
    id: "console",
    labelId: "page.home.proof.privacy.console.label",
    labelDefault: "Console",
    valueId: "page.home.proof.privacy.console.value",
    valueDefault: "Session after sign-in",
    color: "cyan",
  },
  {
    id: "radio",
    labelId: "page.home.proof.privacy.radio.label",
    labelDefault: "Radio",
    valueId: "page.home.proof.privacy.radio.value",
    valueDefault: "Stays LoRa",
    color: "soft",
  },
  {
    id: "packets",
    labelId: "page.home.proof.privacy.packets.label",
    labelDefault: "Packets",
    valueId: "page.home.proof.privacy.packets.value",
    valueDefault: "Stored here",
    color: "soft",
  },
] as const;

export function LandingProof({ className }: { className?: string }): ReactElement {
  const { formatMessage } = useIntl();
  return (
    <LandingReveal className={className}>
      <ul className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        <li>
          <Frame className="h-full shadow-card">
            <FrameHeader>
              <FrameTitle>
                <RiPulseLine />
                {formatMessage({ id: "page.home.proof.packets.title", defaultMessage: "Packets" })}
              </FrameTitle>
              <FrameDescription>
                {formatMessage({
                  id: "page.home.proof.packets.description",
                  defaultMessage: "Telemetry as it lands, with nothing to refresh.",
                })}
              </FrameDescription>
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
                {formatMessage({ id: "page.home.proof.globe.title", defaultMessage: "Live globe" })}
              </FrameTitle>
              <FrameDescription>
                {formatMessage({
                  id: "page.home.proof.globe.description",
                  defaultMessage: "Sample mesh over the western Mediterranean.",
                })}
              </FrameDescription>
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
                {formatMessage({ id: "page.home.proof.lora.title", defaultMessage: "The radio stays LoRa" })}
              </FrameTitle>
              <FrameDescription>
                {formatMessage({
                  id: "page.home.proof.lora.description",
                  defaultMessage: "Nowhere to click. Nothing to accept.",
                })}
              </FrameDescription>
            </FrameHeader>
            <FramePanel className="flex h-52 flex-col justify-center p-0">
              <ul className="flex flex-col" aria-hidden>
                {privacy.map((row) => (
                  <li key={row.id} className="flex h-8 items-center justify-between gap-3 px-3">
                    <span className="text-body-medium text-text-primary">
                      {formatMessage({ id: row.labelId, defaultMessage: row.labelDefault })}
                    </span>
                    <Chip variant="caption" color={row.color} className="rounded-full">
                      {formatMessage({ id: row.valueId, defaultMessage: row.valueDefault })}
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
