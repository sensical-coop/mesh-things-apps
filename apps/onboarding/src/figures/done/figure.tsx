import { useIntl } from "react-intl";
import { PUBLISH_INTERVAL_SECONDS } from "@/timing";
import { Plate } from "@/iso/react/draw";
import { figLabel } from "../view";
import { DoneLive } from "./live";
import { MISSED_TO_TRIP, seenSeconds } from "./model";
import "./done.css";

export function DoneFigure() {
  const { formatMessage } = useIntl();
  return (
    <Plate
      fig={figLabel("done")}
      title={formatMessage({ id: "figure.done.title", defaultMessage: "Watchdog dial", })}
      hint={formatMessage({ id: "figure.done.hint", defaultMessage: "Hold to pause packets" })}
      readout={formatMessage(
        { id: "figure.done.readout", defaultMessage: "Seen {seconds} s ago · {watchdog}" },
        { seconds: String(seenSeconds(2)), watchdog: formatMessage({ id: "figure.done.armed", defaultMessage: "armed" }) },
      )}
      keys={[
        { mark: "dotted", label: formatMessage({ id: "figure.done.key.lora", defaultMessage: "LoRa hop" }) },
        { mark: "dashed", label: formatMessage({ id: "figure.done.key.wifi", defaultMessage: "Wi-Fi to Mesh Things" }) },
      ]}
      caption={formatMessage(
        {
          id: "figure.done.caption",
          defaultMessage:
          "Three nodes and the gateway share the bench. Packets hop over the air to the gateway, which sends them over Wi-Fi to Mesh Things. Each packet rewinds the dial. The email flag drops after the default of {missed} missed {minutes}-minute intervals.",
        },
        { missed: MISSED_TO_TRIP, minutes: PUBLISH_INTERVAL_SECONDS / 60 },
      )}
    >
      <DoneLive />
    </Plate>
  );
}
