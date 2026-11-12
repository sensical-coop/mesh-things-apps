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
import { FormattedMessage, useIntl } from "react-intl";
import { richTextValues } from "./intl-tags";
import { SectionHeading } from "./section-heading";
import { LandingGlobe } from "./globe";
import { LandingPacketFeed } from "./packet-feed";
import { LandingReveal } from "./reveal";

const privacy = [
  {
    id: "page",
    labelId: "page.home.proof.privacy.page.label",
    labelDefault: "Raspberry Pi",
    valueId: "page.home.proof.privacy.page.value",
    valueDefault: "Lite version",
    color: "lime",
  },
  {
    id: "console",
    labelId: "page.home.proof.privacy.console.label",
    labelDefault: "Cloud solutions",
    valueId: "page.home.proof.privacy.console.value",
    valueDefault: "All features enabled",
    color: "cyan",
  },
  {
    id: "radio",
    labelId: "page.home.proof.privacy.radio.label",
    labelDefault: "Radio",
    valueId: "page.home.proof.privacy.radio.value",
    valueDefault: "Meshtastic compatible",
    color: "soft",
  },
  {
    id: "packets",
    labelId: "page.home.proof.privacy.packets.label",
    labelDefault: "Packets",
    valueId: "page.home.proof.privacy.packets.value",
    valueDefault: "Telemetry packets of all types",
    color: "soft",
  },
] as const;

export function LandingProof(): ReactElement {
  const { formatMessage } = useIntl();
  return (
    <section id="proof" className="scroll-mt-24">
      <SectionHeading>
        <FormattedMessage
          id="page.home.proof.heading"
          defaultMessage="Live data in two clicks, <secondary>deploy as you need.</secondary>"
          values={richTextValues}
        />
      </SectionHeading>
      <LandingReveal className="mt-12 sm:mt-16">
        <ul className="grid gap-4 sm:gap-6 lg:grid-cols-3">
          <li>
            <Frame className="h-full shadow-card">
              <FrameHeader>
                <FrameTitle>
                  <RiPulseLine />
                  {formatMessage({ id: "page.home.proof.packets.title", defaultMessage: "Data packets" })}
                </FrameTitle>
                <FrameDescription>
                  {formatMessage({
                    id: "page.home.proof.packets.description",
                    defaultMessage: "Get data from your nodes in real time.",
                  })}
                </FrameDescription>
              </FrameHeader>
              <LandingPacketFeed className="h-52" />
            </Frame>
          </li>
          <li>
            <Frame className="h-full shadow-card">
              <FrameHeader>
                <FrameTitle>
                  <RiEarthLine />
                  {formatMessage({ id: "page.home.proof.globe.title", defaultMessage: "Visualize your mesh" })}
                </FrameTitle>
                <FrameDescription>
                  {formatMessage({
                    id: "page.home.proof.globe.description",
                    defaultMessage: "Map your nodes automatically.",
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
                  {formatMessage({ id: "page.home.proof.lora.title", defaultMessage: "Deploy locally or on the cloud" })}
                </FrameTitle>
                <FrameDescription>
                  {formatMessage({
                    id: "page.home.proof.lora.description",
                    defaultMessage: "Easily deployable on a Raspberry Pi, with forwarding options.",
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
    </section>
  );
}
