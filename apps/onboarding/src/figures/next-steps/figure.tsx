import { useIntl } from "react-intl";
import { figLabel } from "../view";
import { Plate } from "@/iso/react/draw";
import { NextStepsArt } from "./art";
import { REST_READING, fahrenheit, formatTenths } from "./model";

export function NextStepsFigure() {
  const { formatMessage } = useIntl();
  const reading = formatTenths(REST_READING);
  const state = formatMessage({ id: "figure.next-steps.inRange", defaultMessage: "in range" });
  return (
    <Plate
      fig={figLabel("next-steps")}
      title={formatMessage({ id: "figure.next-steps.title", defaultMessage: "Alarms and blueprints" })}
      hint={formatMessage({ id: "figure.next-steps.hint", defaultMessage: "Drag · ← → · ↑ ↓" })}
      readout={formatMessage(
        { id: "figure.next-steps.readout", defaultMessage: "{reading} °C · {state}" },
        { reading, state },
      )}
      caption={formatMessage(
        {
          id: "figure.next-steps.caption",
          defaultMessage:
            "A sensor node with a BME280 sends the temperature over LoRa. The dial alarms when that reading leaves the range you set. The slide rule is a blueprint: it turns the same reading into a new channel, so {reading} °C is {derived} °F. Drag the dial or use the arrow keys. Up and down move the high set-point; Shift moves the low one.",
        },
        { reading, derived: formatTenths(fahrenheit(REST_READING)) },
      )}
    >
      <NextStepsArt
        label={formatMessage({
          id: "figure.next-steps.label",
          defaultMessage:
            "Sensor node with a BME280 sending the temperature over the air to a panel thermometer with two set-point pointers, an alarm bell and an envelope chute, beside a slide rule. Drag to move the reading.",
        })}
      />
    </Plate>
  );
}
