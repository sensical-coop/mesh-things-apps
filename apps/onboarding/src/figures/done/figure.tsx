import { useIntl } from "react-intl";
import { Plate } from "@/iso/react/draw";
import { DoneLive } from "./live";
import "./done.css";

export function DoneFigure() {
  const intl = useIntl();
  const { formatMessage } = intl;
  const key = (id: string, defaultMessage: string) =>
    Object.prototype.hasOwnProperty.call(intl.messages, id) ? formatMessage({ id, defaultMessage }) : defaultMessage;
  return (
    <Plate
      fig="Fig 9"
      title={formatMessage({ id: "figure.done.title", defaultMessage: "Watchdog dial", })}
      hint={formatMessage({ id: "figure.done.hint", defaultMessage: "Hold to pause packets" })}
      readout={formatMessage(
        { id: "figure.done.readout", defaultMessage: "Seen {seconds} s ago · {watchdog}" },
        { seconds: "120", watchdog: formatMessage({ id: "figure.done.armed", defaultMessage: "armed" }) },
      )}
      keys={[
        { mark: "dotted", label: key("figure.done.key.lora", "LoRa hop") },
        { mark: "dashed", label: key("figure.done.key.wifi", "Wi-Fi to Mesh Things") },
      ]}
      caption={formatMessage({
        id: "figure.done.caption",
        defaultMessage:
          "Three nodes and the gateway share the bench. Packets hop over the air to the gateway, which sends them over Wi-Fi to Mesh Things. Each packet rewinds the dial. The email flag drops after the default of three missed half-hour intervals.",
      })}
    >
      <DoneLive />
    </Plate>
  );
}
