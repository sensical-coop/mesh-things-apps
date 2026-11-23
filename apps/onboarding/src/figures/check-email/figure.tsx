import { useIntl } from "react-intl";
import { POLL_MS } from "@/timing";
import { COOLDOWN_SECONDS } from "./model";
import { Plate } from "@/iso/react/draw";
import { figLabel } from "../view";
import { CheckEmailArt } from "./art";

export function CheckEmailFigure() {
  const { formatMessage } = useIntl();
  return (
    <Plate
      fig={figLabel("check-email")}
      title={formatMessage({ id: "figure.check-email.title", defaultMessage: "Check the mailbox" })}
      hint={formatMessage({ id: "figure.check-email.hint", defaultMessage: "Drag or ← →" })}
      readout={formatMessage({ id: "figure.check-email.readout.waiting", defaultMessage: "Waiting" })}
      keys={[
        {
          mark: "red",
          label: formatMessage({ id: "figure.check-email.key.flag", defaultMessage: "Flag up: the message was sent" }),
        },
        {
          mark: "lit",
          label: formatMessage({ id: "figure.check-email.key.lamp", defaultMessage: "Lamp on: the link was opened" }),
        },
      ]}
      caption={formatMessage(
        {
          id: "figure.check-email.caption",
          defaultMessage:
          "A letter drops in and the flag rises. The dial runs the {cooldown}-second resend wait down to zero, then the door opens, the letter is taken and the lamp lights. This step checks every {poll} seconds and continues on its own.",
        },
        { cooldown: COOLDOWN_SECONDS, poll: POLL_MS / 1000 },
      )}
    >
      <CheckEmailArt />
    </Plate>
  );
}
