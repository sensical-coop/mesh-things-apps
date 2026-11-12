import { useIntl } from "react-intl";
import { Plate } from "@/iso/react/draw";
import { figLabel } from "../view";
import { RegisterLive } from "./live";
import "./register.css";

export function RegisterFigure() {
  const { formatMessage } = useIntl();
  return (
    <Plate
      fig={figLabel("register")}
      title={formatMessage({ id: "figure.register.title", defaultMessage: "Read the node ID" })}
      hint={formatMessage({ id: "figure.register.hint", defaultMessage: "Drag or ← →" })}
      readout="!00000000 = 0"
      caption={formatMessage({
        id: "figure.register.caption",
        defaultMessage:
          "Eight wheels set the hex node ID. The radio screen shows the short name (the last four digits) and the full ID, the same ID the Meshtastic app shows as hex or decimal.",
      })}
    >
      <RegisterLive />
    </Plate>
  );
}
