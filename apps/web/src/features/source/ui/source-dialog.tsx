import type { SourceRead } from "@mtt/contracts";
import { zSourcesCreateData, zSourcesUpdateData } from "@mtt/contracts/zod";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { Checkbox } from "@mtt/ui/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@mtt/ui/components/ui/field";
import { Input } from "@mtt/ui/components/ui/input";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, type ReactElement, useState } from "react";
import { useIntl } from "react-intl";
import { FormCheckbox } from "@/components/form/form-checkbox";
import { FormField } from "@/components/form/form-field";
import { FormSelect } from "@/components/form/form-select";
import { Modal } from "@/components/modal";
import { StatusCopy } from "@/components/status-copy";
import { issueErrors, readApiError } from "@/lib/api-errors";
import { dialogActionsClass } from "@/lib/dialog-actions";
import { sourceTitle, validateSourceFields } from "@/features/source/model";
import type { TermsAcceptance } from "@/features/terms/model";
import { useTermsEnforced } from "@/features/terms/use-terms-enforced";
import { sourceRepository } from "@/features/source/repository";

export type SourceDialogProps = {
  open: boolean;
  /** The source to edit; without one the dialog adds a new source. */
  source?: SourceRead;
  /** Required to add a source: the terms step the operator went through first. */
  termsAcceptance?: TermsAcceptance | null;
  onClose: () => void;
  onSaved: (source: SourceRead) => void;
};

const QOS_ITEMS = [
  { label: "1 — at least once", value: "1" },
  { label: "0 — at most once", value: "0" },
] as const;

function optional(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? "").trim();
  return text === "" ? null : text;
}

export function SourceDialog({ open, source, termsAcceptance, onClose, onSaved }: SourceDialogProps): ReactElement {
  const { formatMessage } = useIntl();
  const queryClient = useQueryClient();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  // Editing only: the stored password is never returned. Kept unless unticked;
  // unticked and left blank removes it.
  const [keepPassword, setKeepPassword] = useState(true);
  const editing = source !== undefined;
  // A self-hosted instance asks for no terms; unknown counts as enforced.
  const termsEnforced = useTermsEnforced() !== false;

  async function onSuccess(saved: SourceRead) {
    await queryClient.invalidateQueries({ queryKey: sourceRepository.listKey() });
    onSaved(saved);
    close();
  }

  // Nothing changes on any failure: the API drops a new row, or rolls an edit back,
  // when the bridge can't be set up.
  function onError(error: unknown) {
    const { status, detail, fields } = readApiError(error);
    const { non_field_errors: nonField, terms_version: termsError, ...byField } = fields;
    setErrors(byField);
    if (termsError) {
      // The terms changed between the step and the save: start again from the new text.
      setFormError(
        formatMessage({
          id: "feature.source.dialog.termsChanged",
          defaultMessage: "The source terms have changed. Close this dialog and accept the current terms to add the source.",
        }),
      );
    } else if (status === 502) {
      setFormError(
        editing
          ? formatMessage(
              {
                id: "feature.source.dialog.bridgeFailedEdit",
                defaultMessage: "The bridge could not be reconfigured. No changes were applied. {detail}",
              },
              { detail: detail ?? "" },
            )
          : formatMessage(
              {
                id: "feature.source.createDialog.bridgeFailed",
                defaultMessage: "The bridge could not be set up. The source was not saved. {detail}",
              },
              { detail: detail ?? "" },
            ),
      );
    } else if (status === 403) {
      setFormError(
        formatMessage({
          id: "feature.source.createDialog.forbidden",
          defaultMessage: "Only operators can add sources.",
        }),
      );
    } else if (status === 404) {
      setFormError(
        formatMessage({
          id: "feature.source.dialog.notFound",
          defaultMessage: "This source no longer exists. Close this dialog and refresh the list.",
        }),
      );
    } else if (Object.keys(byField).length > 0) {
      setFormError(null);
    } else {
      setFormError(
        nonField ??
          detail ??
          formatMessage({
            id: "feature.source.createDialog.error",
            defaultMessage: "The source was not added. Check the fields and try again.",
          }),
      );
    }
  }

  const create = useMutation({ ...sourceRepository.create(), onSuccess, onError });
  const update = useMutation({ ...sourceRepository.update(), onSuccess, onError });
  const pending = create.isPending || update.isPending;

  function close() {
    setErrors({});
    setFormError(null);
    setKeepPassword(true);
    create.reset();
    update.reset();
    onClose();
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing && termsEnforced && !termsAcceptance) {
      setFormError(
        formatMessage({
          id: "feature.source.dialog.termsRequired",
          defaultMessage: "Accept the source terms before adding a source.",
        }),
      );
      return;
    }
    const form = new FormData(event.currentTarget);
    const password = optional(form.get("password"));
    // Adding sends what was typed (or null). Editing leaves the password out to keep
    // it, or sends the new one, or "" to remove it.
    const passwordField = !editing ? { password } : keepPassword ? {} : { password: password ?? "" };
    const body = {
      label: optional(form.get("label")),
      server: String(form.get("server") ?? "").trim(),
      ssl: form.get("ssl") === "on",
      username: optional(form.get("username")),
      // Passwords are never returned, so an edit leaves a blank field out to keep the current one.
      ...passwordField,
      ...(editing || !termsAcceptance
        ? {}
        : { terms_version: termsAcceptance.version, terms_locale: termsAcceptance.locale }),
      topic: String(form.get("topic") ?? "").trim(),
      qos: Number(form.get("qos") ?? 1),
    };
    const checks = validateSourceFields(body);
    setFormError(null);
    if (editing) {
      const parsed = zSourcesUpdateData.safeParse({ path: { source_id: source.id }, body });
      const next = { ...checks, ...(parsed.success ? {} : issueErrors(parsed.error.issues)) };
      setErrors(next);
      if (parsed.success && Object.keys(next).length === 0) update.mutate(parsed.data);
      return;
    }
    const parsed = zSourcesCreateData.safeParse({ body });
    const next = { ...checks, ...(parsed.success ? {} : issueErrors(parsed.error.issues)) };
    setErrors(next);
    if (parsed.success && Object.keys(next).length === 0) create.mutate({ body: parsed.data.body });
  }

  return (
    <Modal
      open={open}
      title={
        editing
          ? formatMessage(
              { id: "feature.source.dialog.editTitle", defaultMessage: "Edit source — {source}" },
              { source: sourceTitle(source) },
            )
          : formatMessage({ id: "feature.source.createDialog.title", defaultMessage: "Add source" })
      }
      description={
        editing
          ? formatMessage({
              id: "feature.source.dialog.editDescription",
              defaultMessage: "Saving will reconfigure this bridge. Meshes on this source will keep using it.",
            })
          : formatMessage({
              id: "feature.source.createDialog.description",
              defaultMessage:
                "Bridge a topic from another MQTT broker into this instance. Only you can see it and attach meshes to it.",
            })
      }
      onClose={close}
    >
      <form key={source?.id ?? "new"} className="flex flex-col gap-5" onSubmit={onSubmit} noValidate>
        <FieldGroup>
          <FormField
            id="source-label"
            label={formatMessage({ id: "feature.source.createDialog.label", defaultMessage: "Label" })}
            error={errors.label}
          >
            <Input id="source-label" name="label" autoComplete="off" defaultValue={source?.label ?? ""} />
          </FormField>
          <FormField
            id="source-server"
            label={formatMessage({ id: "feature.source.createDialog.server", defaultMessage: "Server" })}
            hint={formatMessage({
              id: "feature.source.createDialog.serverHint",
              defaultMessage: "Remote broker as host:port, for example mqtt.example.org:1883.",
            })}
            error={errors.server}
          >
            <Input id="source-server" name="server" required autoComplete="off" defaultValue={source?.server} />
          </FormField>
          <FormField
            id="source-topic"
            label={formatMessage({ id: "feature.source.createDialog.topic", defaultMessage: "Topic filter" })}
            hint={formatMessage({
              id: "feature.source.createDialog.topicHint",
              defaultMessage: "For example msh/EU_868/2/e/MyChannel/#. $share and $SYS topics are not accepted.",
            })}
            error={errors.topic}
          >
            <Input id="source-topic" name="topic" required autoComplete="off" defaultValue={source?.topic} />
          </FormField>
          <FormCheckbox
            id="source-ssl"
            name="ssl"
            label={formatMessage({ id: "feature.source.createDialog.ssl", defaultMessage: "Connect over TLS" })}
            defaultChecked={source?.ssl ?? true}
          />
          <FormField
            id="source-username"
            label={formatMessage({ id: "feature.source.createDialog.username", defaultMessage: "Username" })}
            error={errors.username}
          >
            <Input id="source-username" name="username" autoComplete="off" defaultValue={source?.username ?? ""} />
          </FormField>
          <FormField
            id="source-password"
            label={formatMessage({ id: "feature.source.createDialog.password", defaultMessage: "Password" })}
            hint={
              !editing
                ? formatMessage({
                    id: "feature.source.createDialog.passwordHint",
                    defaultMessage: "Stored for the bridge and never shown again.",
                  })
                : keepPassword
                  ? formatMessage({
                      id: "feature.source.dialog.passwordKeptHint",
                      defaultMessage: "The current password stays. Untick below to change or remove it.",
                    })
                  : formatMessage({
                      id: "feature.source.dialog.passwordEditHint",
                      defaultMessage: "Type a new password, or leave blank to remove the current one.",
                    })
            }
            error={errors.password}
          >
            <Input
              id="source-password"
              name="password"
              type="password"
              autoComplete="new-password"
              disabled={editing && keepPassword}
            />
          </FormField>
          {editing ? (
            <Field orientation="horizontal">
              <Checkbox
                id="source-keep-password"
                checked={keepPassword}
                onCheckedChange={(checked) => setKeepPassword(checked)}
              />
              <FieldLabel htmlFor="source-keep-password" className="text-body-regular text-text-primary">
                {formatMessage({ id: "feature.source.dialog.keepPassword", defaultMessage: "Keep password as is" })}
              </FieldLabel>
            </Field>
          ) : null}
          <FormField
            id="source-qos"
            label={formatMessage({ id: "feature.source.createDialog.qos", defaultMessage: "QoS" })}
            error={errors.qos}
          >
            <FormSelect id="source-qos" name="qos" items={QOS_ITEMS} defaultValue={String(source?.qos ?? 1)} />
          </FormField>
        </FieldGroup>
        {formError ? <StatusCopy>{formError}</StatusCopy> : null}
        <div className={dialogActionsClass}>
          <Button type="button" variant="secondary" size="small" onClick={close}>
            {formatMessage({ id: "feature.source.createDialog.cancel", defaultMessage: "Cancel" })}
          </Button>
          <Button type="submit" size="small" disabled={pending}>
            {editing
              ? pending
                ? formatMessage({ id: "feature.source.dialog.savingEdit", defaultMessage: "Saving" })
                : formatMessage({ id: "feature.source.dialog.saveEdit", defaultMessage: "Save source" })
              : pending
                ? formatMessage({ id: "feature.source.createDialog.saving", defaultMessage: "Adding source" })
                : formatMessage({ id: "feature.source.createDialog.submit", defaultMessage: "Add source" })}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
