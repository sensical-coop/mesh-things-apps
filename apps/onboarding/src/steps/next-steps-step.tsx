import type { DeviceRead } from "@mtt/contracts";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { Checkbox } from "@mtt/ui/components/ui/checkbox";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type ReactElement, useState } from "react";
import { useIntl } from "react-intl";
import { deviceRepository } from "@/features/device/repository";
import { meshRepository } from "@/features/mesh/repository";
import { NextStepsFigure } from "@/figures/next-steps/figure";
import { StepHeading } from "./step-heading";
import { StepLayout } from "./step-layout";

const DEFAULT_PUBLISH_INTERVAL_SECONDS = 1800;

export function NextStepsStep({
  gateway,
  onDone,
}: {
  gateway: DeviceRead;
  onDone: (absenceOn: boolean) => void;
}): ReactElement {
  const { formatMessage } = useIntl();
  const queryClient = useQueryClient();
  const [on, setOn] = useState(gateway.absence_detection_enabled);
  const [error, setError] = useState(false);
  const name = gateway.label?.trim() || formatMessage({ id: "page.start.next.thisGateway", defaultMessage: "this gateway" });
  const update = useMutation({
    ...deviceRepository.update(),
    onSuccess: async (device) => {
      await queryClient.invalidateQueries({ queryKey: meshRepository.devicesKey(device.mesh_id) });
      onDone(device.absence_detection_enabled);
    },
    onError: () => setError(true),
  });

  function finish() {
    setError(false);
    if (!on) {
      onDone(false);
      return;
    }
    update.mutate({
      deviceUuid: gateway.uuid,
      data: {
        absence_detection_enabled: true,
        publish_interval_seconds: gateway.publish_interval_seconds ?? DEFAULT_PUBLISH_INTERVAL_SECONDS,
      },
    });
  }

  return (
    <StepLayout figure={<NextStepsFigure />}>
      <StepHeading>
        {formatMessage({ id: "page.start.next.title", defaultMessage: "What you can do next" })}
      </StepHeading>
      <p className="text-body-medium text-text-secondary">
        {formatMessage({
          id: "page.start.next.alarms",
          defaultMessage: "Alarms live under Alarms in the console. They email you when a reading leaves the range you set.",
        })}
      </p>
      <p className="text-body-medium text-text-secondary">
        {formatMessage({
          id: "page.start.next.blueprints",
          defaultMessage: "Blueprints live under Blueprints. A blueprint derives a new channel from readings a device already sends.",
        })}
      </p>
      <label
        htmlFor="start-absence"
        className="flex cursor-pointer items-start gap-3 oa-squircle-inset border border-separator-border p-4 text-body-medium text-text-primary has-data-checked:border-accent-500"
      >
        <Checkbox id="start-absence" className="mt-0.5" checked={on} onCheckedChange={(checked) => setOn(checked === true)} />
        <span>
          {formatMessage({ id: "page.start.next.toggle", defaultMessage: "Email me if {name} stops sending" }, { name })}
          <span className="mt-1 block text-body-2-regular text-text-secondary">
            {formatMessage({
              id: "page.start.next.toggleHelp",
              defaultMessage: "The email goes to this account after several missed intervals. One gap does not send it.",
            })}
          </span>
        </span>
      </label>
      {error ? (
        <p className="text-body-medium text-text-secondary" role="alert">
          {formatMessage({
            id: "page.start.next.error",
            defaultMessage: "That setting didn't save. Check your connection and try again.",
          })}
        </p>
      ) : null}
      <Button type="button" size="medium" disabled={update.isPending} onClick={finish}>
        {formatMessage({ id: "page.start.next.finish", defaultMessage: "Finish setup" })}
      </Button>
    </StepLayout>
  );
}
