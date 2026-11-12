import { useIntl } from "react-intl";
import { POLL_MS } from "@/timing";
import { Plate } from "@/iso/react/draw";
import { figLabel } from "../view";
import { ConnectArt } from "./art";
import "./connect.css";
import { readoutOf, type ReadoutWords } from "./model";

export function ConnectFigure() {
  const { formatMessage } = useIntl();
  const words: ReadoutWords = {
    mqtt: formatMessage({ id: "figure.connect.mqtt", defaultMessage: "MQTT" }),
    uplink: formatMessage({ id: "figure.connect.uplink", defaultMessage: "Uplink" }),
    encryption: formatMessage({ id: "figure.connect.encryption", defaultMessage: "Encryption" }),
    on: formatMessage({ id: "figure.connect.on", defaultMessage: "on" }),
    off: formatMessage({ id: "figure.connect.off", defaultMessage: "off" }),
    of: formatMessage({ id: "figure.connect.of", defaultMessage: "of 3 on" }),
    waiting: formatMessage({ id: "figure.connect.waiting", defaultMessage: "waiting" }),
    seen: formatMessage({ id: "figure.connect.seen", defaultMessage: "seen" }),
  };
  const copy = {
    ...words,
    aria: formatMessage({
      id: "figure.connect.aria",
      defaultMessage: "Gateway toggles on the phone. Arrows pick a toggle, up and down or space flip it, home and end set them all.",
    }),
  };
  return (
    <Plate
      fig={figLabel("connect")}
      title={formatMessage({ id: "figure.connect.title", defaultMessage: "Connect the gateway" })}
      hint={formatMessage({ id: "figure.connect.hint", defaultMessage: "Flip a toggle" })}
      readout={readoutOf(0, false, words)}
      keys={[
        { mark: "raised", label: formatMessage({ id: "figure.connect.key.switch", defaultMessage: "Toggle on" }) },
        { mark: "lit", label: formatMessage({ id: "figure.connect.key.packet", defaultMessage: "Packet to the broker once the gateway is seen" }) },
        { mark: "dotted", label: formatMessage({ id: "figure.connect.key.wait", defaultMessage: "Bluetooth link to the phone" }) },
      ]}
      caption={formatMessage(
        {
          id: "figure.connect.caption",
          defaultMessage:
          "The phone runs the Meshtastic app and links to the gateway node over Bluetooth LE. On the screen, top to bottom, the toggles are MQTT, uplink and encryption. Only when all three are on does the radio show Wi-Fi arcs and a packet travel over Wi-Fi to the MQTT broker, and the seen lamp on the broker lights. The page checks every {seconds} seconds.",
        },
        { seconds: POLL_MS / 1000 },
      )}
    >
      <ConnectArt
        copy={copy}
        label={formatMessage({
          id: "figure.connect.label",
          defaultMessage: "Phone with MQTT, uplink and encryption toggles, linked by Bluetooth to the gateway node. The packet reaches the broker when all three are on.",
        })}
      />
    </Plate>
  );
}
