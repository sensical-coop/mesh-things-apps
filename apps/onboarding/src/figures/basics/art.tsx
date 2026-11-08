import type { ReactElement } from "react";
import { useIntl } from "react-intl";
import { Dots, FaceText, Line, Solid } from "@/iso/react/draw";
import { AirWaves } from "../parts/air-waves-art";
import { LoraRadio } from "../parts/lora-radio-art";
import { BASE, GATE, GATE_RINGS, INGEST, MESH_LINKS, NODE_RINGS, PACKET, RADIOS, SORT, SORT_LABEL, STORE, UPLINK, WIFI } from "./geometry";
import { BasicsLive } from "./live";
import type { BasicsConcept } from "./model";

export function BasicsArt({ selected, label }: { selected: BasicsConcept; label: string }): ReactElement {
  const intl = useIntl();
  const { formatMessage } = intl;
  const say = (id: string, fallback: string): string =>
    Object.prototype.hasOwnProperty.call(intl.messages, id) ? formatMessage({ id, defaultMessage: fallback }) : fallback;
  const mqtt = formatMessage({ id: "figure.basics.face.mqtt", defaultMessage: "MQTT" });
  const nodes = [
    say("figure.basics.node.c3d4", "!c3d4"),
    say("figure.basics.node.09ae", "!09ae"),
  ];

  return (
    <BasicsLive
      selected={selected}
      label={label}
      base={
        <g key="base">
          <path className="iso-halo" d={BASE.halo} />
          {BASE.feet.map((paths, index) => (
            <Solid key={`foot-${index}`} paths={paths} tone="lo" crease="faint" />
          ))}
          {BASE.pads.map((paths, index) => (
            <Solid key={`pad-${index}`} paths={paths} tone="mid" crease="none" />
          ))}
          <Solid paths={BASE.slab} tone="mid" crease="faint" />
          <Line d={BASE.groove} tone="lo" />
          <Dots points={BASE.screws} size={0.7} tone="mid" />
        </g>
      }
      radios={
        <g key="radios">
          {RADIOS.map((radio, index) => (
            <LoraRadio key={index} parts={radio} screen={nodes[index]} />
          ))}
        </g>
      }
      mesh={
        <g key="mesh">
          <AirWaves rings={[...NODE_RINGS, ...GATE_RINGS]} links={[...MESH_LINKS.map((d) => ({ d })), { d: PACKET.d }]} />
        </g>
      }
      gate={
        <g key="gate">
          <Solid paths={GATE.plinth} tone="lo" crease="faint" />
          <LoraRadio
            parts={GATE.radio}
            screen={say("figure.basics.gate.screen", "Wi-Fi")}
          />
        </g>
      }
      uplink={
        <g key="uplink">
          <AirWaves rings={WIFI} links={[{ d: UPLINK.d, dashed: true }]} />
        </g>
      }
      sort={
        <g key="sort">
          <Solid paths={SORT.body} tone="mid" crease="faint" />
          <Line d={SORT.seam} tone="faint" />
          <Line d={SORT.vents} tone="lo" />
          <Solid paths={SORT.plate} tone="lo" crease="none" />
          <Line d={SORT.rules} tone="lo" />
          {SORT.leds.map((paths, index) => (
            <Solid key={index} paths={paths} tone="hi" crease="none" />
          ))}
          <Solid paths={SORT.port} tone="lo" crease="faint" />
          <Dots points={SORT.screws} size={0.5} tone="mid" />
          <FaceText transform={SORT_LABEL} size={4.4} tone="mid">
            {mqtt}
          </FaceText>
        </g>
      }
      store={
        <g key="store">
          <Line d={INGEST.d} tone="lo" />
          {STORE.discs.map((paths, index) => (
            <Solid key={index} paths={paths} tone="mid" crease="faint" />
          ))}
        </g>
      }
    />
  );
}
