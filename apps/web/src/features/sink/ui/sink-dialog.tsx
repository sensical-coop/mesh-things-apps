import type { SinkCredentials, SinkRead, StreamsEnum } from "@mtt/contracts";
import { zSinksCreateData, zSinksUpdateData } from "@mtt/contracts/zod";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { Checkbox } from "@mtt/ui/components/ui/checkbox";
import { Field, FieldError, FieldGroup, FieldLabel } from "@mtt/ui/components/ui/field";
import { Input } from "@mtt/ui/components/ui/input";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, type ReactElement, useMemo, useState } from "react";
import { useIntl } from "react-intl";
import { FormField } from "@/components/form/form-field";
import { Modal } from "@/components/modal";
import { StatusCopy } from "@/components/status-copy";
import { issueErrors, readApiError } from "@/lib/api-errors";
import { dialogActionsClass } from "@/lib/dialog-actions";
import { useOwnerDirectory } from "@/features/auth/use-owner-directory";
import { deviceTitle } from "@/features/device/model";
import { deviceRepository } from "@/features/device/repository";
import { meshTitle } from "@/features/mesh/model";
import { meshRepository } from "@/features/mesh/repository";
import { orderStreams, SINK_STREAMS, singleDeviceChoices, sinkStreamsError, sinkTitle } from "@/features/sink/model";
import { sinkRepository } from "@/features/sink/repository";
import type { TermsAcceptance } from "@/features/terms/model";
import { useTermsEnforced } from "@/features/terms/use-terms-enforced";

export type SinkDialogProps = {
  open: boolean;
  /** The sink to edit; without one the dialog creates a new sink. */
  sink?: SinkRead;
  /** Required to create a sink: the terms step the operator went through first. */
  termsAcceptance?: TermsAcceptance | null;
  onClose: () => void;
  /** Creating answers with the credentials, shown once. */
  onCreated: (credentials: SinkCredentials) => void;
  onSaved: (sink: SinkRead) => void;
};

const listClass = "oa-squircle-inset flex max-h-56 flex-col gap-2 overflow-y-auto bg-background-secondary-default p-3";

function toggled(set: ReadonlySet<string>, id: string, on: boolean): Set<string> {
  const next = new Set(set);
  if (on) next.add(id);
  else next.delete(id);
  return next;
}

export function SinkDialog({ open, sink, termsAcceptance, onClose, onCreated, onSaved }: SinkDialogProps): ReactElement {
  const { formatMessage } = useIntl();
  const queryClient = useQueryClient();
  const { me } = useOwnerDirectory();
  const editing = sink !== undefined;
  // A self-hosted instance asks for no terms; unknown counts as enforced.
  const termsEnforced = useTermsEnforced() !== false;
  const [streams, setStreams] = useState<ReadonlySet<string>>(() => new Set(sink?.streams ?? ["decoded"]));
  const [meshIds, setMeshIds] = useState<ReadonlySet<string>>(() => new Set(sink?.mesh_ids ?? []));
  const [deviceIds, setDeviceIds] = useState<ReadonlySet<string>>(() => new Set(sink?.device_ids ?? []));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  // Only meshes the caller may edit can be attached; the API also wants them owned by an operator.
  const meshes = useQuery({ ...meshRepository.list(), enabled: open });
  const devices = useQuery({ ...deviceRepository.list(), enabled: open });
  const eligibleMeshes = useMemo(
    () => (meshes.data ?? []).filter((mesh) => me && (me.is_superuser === true || mesh.owner_id === me.id)),
    [meshes.data, me],
  );
  const meshNames = useMemo(() => new Map(eligibleMeshes.map((mesh) => [mesh.id, meshTitle(mesh)])), [eligibleMeshes]);
  const deviceChoices = useMemo(
    () =>
      singleDeviceChoices(
        (devices.data ?? []).filter((device) => meshNames.has(device.mesh_id)),
        meshIds,
        deviceIds,
      ),
    [devices.data, meshNames, meshIds, deviceIds],
  );

  const streamCopy: Record<StreamsEnum, { label: string; hint: string }> = {
    decoded: {
      label: formatMessage({ id: "feature.sink.dialog.stream.decoded", defaultMessage: "Decoded readings" }),
      hint: formatMessage({
        id: "feature.sink.dialog.stream.decodedHint",
        defaultMessage: "Every packet as decoded from the mesh: telemetry, positions and node info.",
      }),
    },
    derived: {
      label: formatMessage({ id: "feature.sink.dialog.stream.derived", defaultMessage: "Derived readings" }),
      hint: formatMessage({
        id: "feature.sink.dialog.stream.derivedHint",
        defaultMessage: "Values your blueprints compute. Only on instances that run postprocessing.",
      }),
    },
    alarms: {
      label: formatMessage({ id: "feature.sink.dialog.stream.alarms", defaultMessage: "Alarms" }),
      hint: formatMessage({
        id: "feature.sink.dialog.stream.alarmsHint",
        defaultMessage: "Data quality alarms as they trigger. Only on instances that run quality checks.",
      }),
    },
  };

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: sinkRepository.listKey() });
  }

  // Nothing changes on any failure: the API drops a new sink, or rolls an edit back,
  // when the broker or the pipeline can't be told.
  function onError(error: unknown) {
    const { status, detail, fields } = readApiError(error);
    const { non_field_errors: nonField, terms_version: termsError, ...byField } = fields;
    setErrors(byField);
    if (termsError) {
      setFormError(
        formatMessage({
          id: "feature.sink.dialog.termsChanged",
          defaultMessage: "The sink terms have changed. Close this dialog and accept the current terms to create the sink.",
        }),
      );
    } else if (status === 502) {
      setFormError(
        editing
          ? formatMessage(
              {
                id: "feature.sink.dialog.brokerFailedEdit",
                defaultMessage: "The broker could not be updated, so the sink was left as it was. {detail}",
              },
              { detail: detail ?? "" },
            )
          : formatMessage(
              {
                id: "feature.sink.dialog.brokerFailed",
                defaultMessage: "The broker could not be set up, so the sink was not created. {detail}",
              },
              { detail: detail ?? "" },
            ),
      );
    } else if (status === 403) {
      setFormError(formatMessage({ id: "feature.sink.dialog.forbidden", defaultMessage: "Only operators can manage sinks." }));
    } else if (status === 404) {
      setFormError(
        formatMessage({
          id: "feature.sink.dialog.notFound",
          defaultMessage: "This sink no longer exists. Close this dialog and refresh the list.",
        }),
      );
    } else if (Object.keys(byField).length > 0) {
      setFormError(null);
    } else {
      setFormError(
        nonField ??
          detail ??
          formatMessage({ id: "feature.sink.dialog.error", defaultMessage: "The sink was not saved. Check the fields and try again." }),
      );
    }
  }

  const create = useMutation({
    ...sinkRepository.create(),
    onSuccess: async (created) => {
      await refresh();
      onCreated(created);
      close();
    },
    onError,
  });
  const update = useMutation({
    ...sinkRepository.update(),
    onSuccess: async (saved) => {
      await refresh();
      onSaved(saved);
      close();
    },
    onError,
  });
  const pending = create.isPending || update.isPending;

  function close() {
    setErrors({});
    setFormError(null);
    create.reset();
    update.reset();
    onClose();
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing && termsEnforced && !termsAcceptance) {
      setFormError(
        formatMessage({ id: "feature.sink.dialog.termsRequired", defaultMessage: "Accept the sink terms before creating a sink." }),
      );
      return;
    }
    const label = String(new FormData(event.currentTarget).get("label") ?? "").trim();
    const chosenStreams = orderStreams(streams);
    const body = {
      label: label === "" ? null : label,
      streams: chosenStreams,
      mesh_ids: [...meshIds],
      // A device whose mesh is sent whole needs no link of its own.
      device_ids: [...deviceIds].filter((id) => {
        const device = devices.data?.find((row) => row.uuid === id);
        return !device || !meshIds.has(device.mesh_id);
      }),
    };
    const streamsError = sinkStreamsError(chosenStreams);
    setFormError(null);
    if (editing) {
      const parsed = zSinksUpdateData.safeParse({ path: { sink_id: sink.id }, body });
      const next = { ...(streamsError ? { streams: streamsError } : {}), ...(parsed.success ? {} : issueErrors(parsed.error.issues)) };
      setErrors(next);
      if (parsed.success && Object.keys(next).length === 0) update.mutate(parsed.data);
      return;
    }
    const withTerms = termsAcceptance
      ? { ...body, terms_version: termsAcceptance.version, terms_locale: termsAcceptance.locale }
      : body;
    const parsed = zSinksCreateData.safeParse({ body: withTerms });
    const next = { ...(streamsError ? { streams: streamsError } : {}), ...(parsed.success ? {} : issueErrors(parsed.error.issues)) };
    setErrors(next);
    if (parsed.success && Object.keys(next).length === 0) create.mutate({ body: parsed.data.body });
  }

  return (
    <Modal
      open={open}
      size="wide"
      title={
        editing
          ? formatMessage({ id: "feature.sink.dialog.editTitle", defaultMessage: "Edit sink — {sink}" }, { sink: sinkTitle(sink) })
          : formatMessage({ id: "feature.sink.dialog.createTitle", defaultMessage: "Create sink" })
      }
      description={
        editing
          ? formatMessage({
              id: "feature.sink.dialog.editDescription",
              defaultMessage: "Changes apply straight away. The credentials stay the same.",
            })
          : formatMessage({
              id: "feature.sink.dialog.createDescription",
              defaultMessage:
                "Publish readings from your meshes on this instance's broker, where a service you choose subscribes with its own credentials.",
            })
      }
      onClose={close}
    >
      <form key={sink?.id ?? "new"} className="flex flex-col gap-5" onSubmit={onSubmit} noValidate>
        <FieldGroup>
          <FormField
            id="sink-label"
            label={formatMessage({ id: "feature.sink.dialog.label", defaultMessage: "Label" })}
            hint={formatMessage({ id: "feature.sink.dialog.labelHint", defaultMessage: "Who or what consumes it, for example Partner dashboard." })}
            error={errors.label}
          >
            <Input id="sink-label" name="label" autoComplete="off" defaultValue={sink?.label ?? ""} />
          </FormField>

          <fieldset className="flex flex-col gap-3">
            <legend className="mb-2 text-caption-1-medium text-text-secondary">
              {formatMessage({ id: "feature.sink.dialog.streams", defaultMessage: "What to send" })}
            </legend>
            {SINK_STREAMS.map((stream) => (
              <Field key={stream} orientation="horizontal">
                <Checkbox
                  id={`sink-stream-${stream}`}
                  checked={streams.has(stream)}
                  onCheckedChange={(checked) => setStreams((current) => toggled(current, stream, checked))}
                />
                <FieldLabel htmlFor={`sink-stream-${stream}`} className="flex flex-col items-start gap-0.5">
                  <span className="text-body-regular text-text-primary">{streamCopy[stream].label}</span>
                  <span className="text-caption-1-regular text-text-tertiary">{streamCopy[stream].hint}</span>
                </FieldLabel>
              </Field>
            ))}
            {errors.streams ? <FieldError>{errors.streams}</FieldError> : null}
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-caption-1-medium text-text-secondary">
              {formatMessage({ id: "feature.sink.dialog.meshes", defaultMessage: "Whole meshes" })}
            </legend>
            <p className="text-caption-1-regular text-text-tertiary">
              {formatMessage({
                id: "feature.sink.dialog.meshesHint",
                defaultMessage: "Every node of the mesh is sent, including nodes that join later.",
              })}
            </p>
            {meshes.isPending ? null : eligibleMeshes.length === 0 ? (
              <StatusCopy>
                {formatMessage({ id: "feature.sink.dialog.noMeshes", defaultMessage: "You have no meshes to attach yet." })}
              </StatusCopy>
            ) : (
              <div className={listClass}>
                {eligibleMeshes.map((mesh) => (
                  <Field key={mesh.id} orientation="horizontal">
                    <Checkbox
                      id={`sink-mesh-${mesh.id}`}
                      checked={meshIds.has(mesh.id)}
                      onCheckedChange={(checked) => setMeshIds((current) => toggled(current, mesh.id, checked))}
                    />
                    <FieldLabel htmlFor={`sink-mesh-${mesh.id}`} className="text-body-regular text-text-primary">
                      {meshTitle(mesh)}
                    </FieldLabel>
                  </Field>
                ))}
              </div>
            )}
            {errors.mesh_ids ? <FieldError>{errors.mesh_ids}</FieldError> : null}
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-caption-1-medium text-text-secondary">
              {formatMessage({ id: "feature.sink.dialog.devices", defaultMessage: "Single devices" })}
            </legend>
            <p className="text-caption-1-regular text-text-tertiary">
              {formatMessage({
                id: "feature.sink.dialog.devicesHint",
                defaultMessage: "Only these nodes are sent. Devices of a mesh sent whole aren't listed.",
              })}
            </p>
            {devices.isPending || deviceChoices.length === 0 ? null : (
              <div className={listClass}>
                {deviceChoices.map((device) => (
                  <Field key={device.uuid} orientation="horizontal">
                    <Checkbox
                      id={`sink-device-${device.uuid}`}
                      checked={deviceIds.has(device.uuid)}
                      onCheckedChange={(checked) => setDeviceIds((current) => toggled(current, device.uuid, checked))}
                    />
                    <FieldLabel htmlFor={`sink-device-${device.uuid}`} className="text-body-regular text-text-primary">
                      {deviceTitle(device)}
                      <span className="text-text-tertiary"> · {meshNames.get(device.mesh_id)}</span>
                    </FieldLabel>
                  </Field>
                ))}
              </div>
            )}
            {errors.device_ids ? <FieldError>{errors.device_ids}</FieldError> : null}
          </fieldset>
        </FieldGroup>
        {formError ? <StatusCopy>{formError}</StatusCopy> : null}
        <div className={dialogActionsClass}>
          <Button type="button" variant="secondary" size="small" onClick={close}>
            {formatMessage({ id: "feature.sink.dialog.cancel", defaultMessage: "Cancel" })}
          </Button>
          <Button type="submit" size="small" disabled={pending}>
            {editing
              ? pending
                ? formatMessage({ id: "feature.sink.dialog.saving", defaultMessage: "Saving" })
                : formatMessage({ id: "feature.sink.dialog.save", defaultMessage: "Save sink" })
              : pending
                ? formatMessage({ id: "feature.sink.dialog.creating", defaultMessage: "Creating sink" })
                : formatMessage({ id: "feature.sink.dialog.create", defaultMessage: "Create sink" })}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
