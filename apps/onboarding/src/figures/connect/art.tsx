import { Dots, FaceText, Line, Solid } from "@/iso/react/draw";
import { LoraRadio } from "../parts/lora-radio-art";
import {
  BLE,
  BROKER_BODY,
  BROKER_LABEL,
  BROKER_SEAM,
  FLOW,
  GATE,
  HOP,
  LAMP_GLOW,
  LAMP_LENS,
  LAMP_RING,
  PHONE_BODY,
  PHONE_DOT,
  PHONE_NOTCH,
  PHONE_RIM,
  PHONE_SCREEN,
  PLATE_BODY,
  PLATE_GROOVE,
  WIFI,
} from "./geometry";
import { ConnectLive, type ConnectCopy } from "./live";

export function ConnectArt({ copy, label }: { copy: ConnectCopy; label: string }) {
  return (
    <ConnectLive
      copy={copy}
      label={label}
      bench={
        <g key="bench">
          <Solid paths={PLATE_BODY} tone="mid" crease="faint" />
          <Line d={PLATE_GROOVE} tone="lo" />
        </g>
      }
      radio={
        <g key="radio">
          <LoraRadio parts={GATE} screen="GW" />
        </g>
      }
      phone={
        <g key="phone">
          <Solid paths={PHONE_BODY} tone="mid" crease="faint" />
          <Solid paths={PHONE_SCREEN} tone="lo" crease="none" />
          <Line d={PHONE_RIM} tone="lo" />
          <Solid paths={PHONE_NOTCH} tone="mid" crease="none" />
          <Dots points={[PHONE_DOT]} size={0.85} tone="hi" />
        </g>
      }
      ble={
        <g key="ble">
          <Line d={BLE} tone="hi" dotted />
        </g>
      }
      broker={
        <g key="broker">
          <Solid paths={BROKER_BODY} tone="mid" inner={<Line d={BROKER_SEAM} tone="faint" />} />
          <FaceText transform={BROKER_LABEL} size={3.4} tone="mid">
            {copy.mqtt}
          </FaceText>
          <Line d={LAMP_RING} tone="lo" />
        </g>
      }
      lens={
        <g key="lens">
          <Solid paths={LAMP_LENS.paths} tone="lo" crease="none" />
          <Line d={LAMP_GLOW} tone="lit" className="lamp-glow" />
        </g>
      }
      wifi={
        <g key="wifi">
          {WIFI.map((d, index) => (
            <Line key={`wifi-${index}`} d={d} tone="hi" className="wifi-arc" />
          ))}
          <Line d={FLOW} tone="hi" dashed />
        </g>
      }
      packet={<circle className="iso-dots" data-tone="hi" r={2.3} cx={HOP.at(0)[0]} cy={HOP.at(0)[1]} />}
    />
  );
}
