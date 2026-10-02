import type { DeviceMeasurement, DevicePostprocessing, PostprocessingBlueprint } from "@mtt/contracts";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { FieldGroup } from "@mtt/ui/components/ui/field";
import { Input } from "@mtt/ui/components/ui/input";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, type ReactElement, useState } from "react";
import { useIntl } from "react-intl";
import { FormField } from "@/components/form/form-field";
import { FormNumber } from "@/components/form/form-number";
import { FormSelect } from "@/components/form/form-select";
import { Modal } from "@/components/modal";
import { StatusCopy } from "@/components/status-copy";
import { errorMessages, PREFIX_PATTERN, versionOutputFields } from "@/features/blueprint/model";
import { blueprintRepository } from "@/features/blueprint/repository";
import { deviceRepository } from "@/features/device/repository";
import { bindableChannels, channelLabel } from "@/features/postprocessing/model";
import { postprocessingRepository } from "@/features/postprocessing/repository";
import { readApiError } from "@/lib/api-errors";
import { dialogActionsClass } from "@/lib/dialog-actions";

const AUTO = "__auto__";
/** Fields this form shows errors under. */
const FIELDS = ["blueprint_id", "blueprint_version", "output_prefix", "tolerance_seconds"];
const UNBOUND = "__none__";

export type PostprocessingDialogProps = {
  deviceUuid: string;
  measurements: readonly DeviceMeasurement[];
  /** Attach: the blueprints this device may run. */
  blueprints: readonly PostprocessingBlueprint[];
  /** Given: rewire it or move it to another version. Absent: attach a blueprint. */
  postprocessing?: DevicePostprocessing;
  onClose: () => void;
};

/** Mount only while open. Which blueprint and version, how its inputs bind to this device's channels, and how outputs are named. */
export function PostprocessingDialog({
  deviceUuid,
  measurements,
  blueprints,
  postprocessing,
  onClose,
}: PostprocessingDialogProps): ReactElement {
  const { formatMessage } = useIntl();
  const queryClient = useQueryClient();
  const [blueprintId, setBlueprintId] = useState(postprocessing?.blueprint_id ?? "");
  const [versionNumber, setVersionNumber] = useState<number | null>(postprocessing?.blueprint_version ?? null);
  const [bindings, setBindings] = useState<Record<string, string>>(() => ({ ...postprocessing?.input_bindings }));
  const [prefix, setPrefix] = useState(postprocessing?.output_prefix ?? "");
  const [messages, setMessages] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const versions = useQuery({
    ...blueprintRepository.versions({ path: { blueprint_id: blueprintId } }),
    enabled: blueprintId !== "",
  });
  const newest = [...(versions.data ?? [])].sort((a, b) => b.number - a.number);
  const version = newest.find((row) => row.number === versionNumber) ?? newest[0];
  const channels = bindableChannels(measurements, postprocessing?.id);

  async function saved() {
    await queryClient.invalidateQueries({ queryKey: postprocessingRepository.listKey({ path: { device_uuid: deviceUuid } }) });
    await queryClient.invalidateQueries({ queryKey: deviceRepository.measurementsKey({ path: { device_uuid: deviceUuid } }) });
    await queryClient.invalidateQueries({ queryKey: deviceRepository.retrieveKey({ path: { device_uuid: deviceUuid } }) });
    await queryClient.invalidateQueries({ queryKey: blueprintRepository.listKey() });
    onClose();
  }

  function failed(error: unknown) {
    const { fields, status } = readApiError(error);
    setFieldErrors(fields);
    if (status === 502) {
      setMessages([
        formatMessage({
          id: "feature.postprocessing.dialog.publishFailed",
          defaultMessage: "The stream tier couldn't be found. Try again.",
        }),
      ]);
      return;
    }
    // Field errors show under their field; everything else (DRF's bare lists, `problems`) goes below the form.
    const rest = typeof error === "object" && error !== null ? Object.entries(error).filter(([key]) => !FIELDS.includes(key)) : [];
    const general = errorMessages(Object.fromEntries(rest));
    const shownInField = FIELDS.some((key) => key in fields);
    setMessages(
      general.length || shownInField
        ? general
        : [formatMessage({ id: "feature.postprocessing.dialog.failed", defaultMessage: "Nothing was saved. Try again." })],
    );
  }

  const attach = useMutation({ ...postprocessingRepository.attach(), onSuccess: saved, onError: failed });
  const update = useMutation({ ...postprocessingRepository.update(), onSuccess: saved, onError: failed });
  const pending = attach.isPending || update.isPending;

  function bindingValue(slot: string): string {
    if (slot in bindings) return bindings[slot] || UNBOUND;
    return postprocessing ? UNBOUND : AUTO;
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!version) return;
    if (!PREFIX_PATTERN.test(prefix)) {
      setFieldErrors({
        output_prefix: formatMessage({
          id: "feature.postprocessing.dialog.prefixInvalid",
          defaultMessage: "Use lowercase letters, digits and underscores.",
        }),
      });
      return;
    }
    setMessages([]);
    setFieldErrors({});
    const form = new FormData(event.currentTarget);
    const tolerance = Number(form.get("tolerance_seconds")) || null;
    // Automatic slots are left out, so the API binds them by their default channel.
    const inputBindings: Record<string, string | null> = {};
    for (const { slot } of version.inputs) {
      const value = bindingValue(slot);
      if (value === UNBOUND) inputBindings[slot] = null;
      else if (value !== AUTO) inputBindings[slot] = value;
    }
    const body = {
      blueprint_version: version.number,
      input_bindings: inputBindings,
      output_prefix: prefix,
      tolerance_seconds: tolerance,
    };
    if (postprocessing) {
      update.mutate({ path: { device_uuid: deviceUuid, postprocessing_id: postprocessing.id }, body });
    } else {
      attach.mutate({ path: { device_uuid: deviceUuid }, body: { ...body, blueprint_id: blueprintId } });
    }
  }

  const outputFields = version ? versionOutputFields(version) : [];

  return (
    <Modal
      open
      title={
        postprocessing
          ? formatMessage(
              { id: "feature.postprocessing.dialog.editTitle", defaultMessage: "Settings — {name}" },
              { name: postprocessing.blueprint_name },
            )
          : formatMessage({ id: "feature.postprocessing.dialog.attachTitle", defaultMessage: "Attach a blueprint" })
      }
      description={
        postprocessing
          ? formatMessage({
              id: "feature.postprocessing.dialog.editDescription",
              defaultMessage:
                "Moving to another version keeps the bindings of inputs it still has, and the calibrations of steps that keep their name and algorithm.",
            })
          : formatMessage({
              id: "feature.postprocessing.dialog.attachDescription",
              defaultMessage:
                "The outputs of this blueprint will appear as channels of this device. Make sure you press \"Start\" and add calibrations if needed.",
            })
      }
      onClose={onClose}
    >
      <form className="flex flex-col gap-5" onSubmit={onSubmit}>
        <FieldGroup>
          {postprocessing ? null : (
            <FormField
              id="postprocessing-blueprint"
              label={formatMessage({ id: "feature.postprocessing.dialog.blueprint", defaultMessage: "Blueprint" })}
              error={fieldErrors.blueprint_id}
            >
              <FormSelect
                id="postprocessing-blueprint"
                name="blueprint_id"
                required
                value={blueprintId}
                placeholder={formatMessage({ id: "feature.postprocessing.dialog.blueprintPlaceholder", defaultMessage: "Choose a blueprint" })}
                items={blueprints.map((row) => ({ label: row.name, value: row.id }))}
                onValueChange={(value) => {
                  setBlueprintId(value);
                  setVersionNumber(null);
                  setBindings({});
                }}
              />
            </FormField>
          )}
          {newest.length ? (
            <FormField
              id="postprocessing-version"
              label={formatMessage({ id: "feature.postprocessing.dialog.version", defaultMessage: "Version" })}
              error={fieldErrors.blueprint_version}
            >
              <FormSelect
                id="postprocessing-version"
                name="blueprint_version"
                value={String(version?.number ?? "")}
                items={newest.map((row, index) => ({
                  value: String(row.number),
                  label:
                    index === 0
                      ? formatMessage({ id: "feature.postprocessing.dialog.versionLatest", defaultMessage: "v{number} (latest)" }, { number: row.number })
                      : `v${row.number}`,
                }))}
                onValueChange={(value) => setVersionNumber(Number(value))}
              />
            </FormField>
          ) : null}
          {version?.inputs.map((input) => (
            <FormField
              key={input.slot}
              id={`postprocessing-slot-${input.slot}`}
              label={formatMessage(
                { id: "feature.postprocessing.dialog.slot", defaultMessage: "Input {slot}" },
                { slot: input.slot },
              )}
            >
              <FormSelect
                id={`postprocessing-slot-${input.slot}`}
                name={`slot_${input.slot}`}
                value={bindingValue(input.slot)}
                items={[
                  ...(postprocessing
                    ? []
                    : [
                        {
                          value: AUTO,
                          label: input.default_channel
                            ? formatMessage(
                                { id: "feature.postprocessing.dialog.slotAuto", defaultMessage: "Automatic ({channel})" },
                                { channel: input.default_channel },
                              )
                            : formatMessage({ id: "feature.postprocessing.dialog.slotAutoNone", defaultMessage: "Automatic (no default)" }),
                        },
                      ]),
                  { value: UNBOUND, label: formatMessage({ id: "feature.postprocessing.dialog.slotNone", defaultMessage: "Not bound" }) },
                  ...channels.map((row) => ({ value: row.id, label: channelLabel(row) })),
                ]}
                onValueChange={(value) => setBindings((current) => ({ ...current, [input.slot]: value === UNBOUND ? "" : value }))}
              />
            </FormField>
          ))}
          {version ? (
            <FormField
              id="postprocessing-prefix"
              label={formatMessage({ id: "feature.postprocessing.dialog.prefix", defaultMessage: "Output prefix" })}
              hint={formatMessage(
                {
                  id: "feature.postprocessing.dialog.prefixHint",
                  defaultMessage: "Needed to attach a blueprint twice. Output: {channels}.",
                },
                { channels: outputFields.map((field) => `derived.${prefix}${field}`).join(", ") },
              )}
              error={fieldErrors.output_prefix}
            >
              <Input
                id="postprocessing-prefix"
                value={prefix}
                autoComplete="off"
                className="font-mono"
                onChange={(event) => setPrefix(event.target.value)}
              />
            </FormField>
          ) : null}
          {version ? (
            <FormField
              id="postprocessing-tolerance"
              label={formatMessage({ id: "feature.postprocessing.dialog.tolerance", defaultMessage: "Join tolerance (s)" })}
              hint={formatMessage({
                id: "feature.postprocessing.dialog.toleranceHint",
                defaultMessage: "Maximum time difference between two inputs in different measurements for them to be combined. Blank: half the device's reading interval, or 30s.",
              })}
              error={fieldErrors.tolerance_seconds}
            >
              <FormNumber
                id="postprocessing-tolerance"
                name="tolerance_seconds"
                min={1}
                defaultValue={postprocessing?.tolerance_seconds ?? undefined}
              />
            </FormField>
          ) : null}
        </FieldGroup>
        {messages.length ? (
          <ul className="flex flex-col gap-1" role="status">
            {messages.map((message) => (
              <li key={message} className="text-body-regular text-text-secondary">
                {message}
              </li>
            ))}
          </ul>
        ) : null}
        {blueprints.length === 0 && !postprocessing ? (
          <StatusCopy>
            {formatMessage({
              id: "feature.postprocessing.dialog.noBlueprints",
              defaultMessage: "No blueprint can run here yet. Create one on the Blueprints page, or use a public one.",
            })}
          </StatusCopy>
        ) : null}
        <div className={dialogActionsClass}>
          <Button type="button" variant="secondary" size="small" onClick={onClose}>
            {formatMessage({ id: "feature.postprocessing.dialog.cancel", defaultMessage: "Cancel" })}
          </Button>
          <Button type="submit" size="small" disabled={pending || !version}>
            {pending
              ? formatMessage({ id: "feature.postprocessing.dialog.saving", defaultMessage: "Saving" })
              : postprocessing
                ? formatMessage({ id: "feature.postprocessing.dialog.save", defaultMessage: "Save settings" })
                : formatMessage({ id: "feature.postprocessing.dialog.attach", defaultMessage: "Attach blueprint" })}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
