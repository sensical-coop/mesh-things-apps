import type { OperatorRequestAdmin } from "@mtt/contracts";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { type ReactElement, useState } from "react";
import { useIntl } from "react-intl";
import {
  DecideOperatorRequestDialog,
  type OperatorRequestDecision,
} from "@/features/operator-request/ui/decide-operator-request-dialog";

export type DecideButtonsProps = {
  request: OperatorRequestAdmin;
  size: "xs" | "small";
};

/** Approve and reject for a pending request, with the dialog that takes the note. */
export function DecideButtons({ request, size }: DecideButtonsProps): ReactElement {
  const { formatMessage } = useIntl();
  const [decision, setDecision] = useState<OperatorRequestDecision | null>(null);
  return (
    <>
      <Button type="button" size={size} onClick={() => setDecision("approve")}>
        {formatMessage({ id: "feature.operatorRequest.decideButtons.approve", defaultMessage: "Approve" })}
      </Button>
      <Button type="button" size={size} variant="secondary" onClick={() => setDecision("reject")}>
        {formatMessage({ id: "feature.operatorRequest.decideButtons.reject", defaultMessage: "Reject" })}
      </Button>
      <DecideOperatorRequestDialog
        request={decision ? request : null}
        decision={decision ?? "approve"}
        onClose={() => setDecision(null)}
      />
    </>
  );
}
