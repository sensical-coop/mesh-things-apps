import type { PostprocessingBlueprint } from "@mtt/contracts";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { FieldGroup } from "@mtt/ui/components/ui/field";
import { Input } from "@mtt/ui/components/ui/input";
import { Textarea } from "@mtt/ui/components/ui/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, type ReactElement, useState } from "react";
import { useIntl } from "react-intl";
import { FormCheckbox } from "@/components/form/form-checkbox";
import { FormField } from "@/components/form/form-field";
import { Modal } from "@/components/modal";
import { StatusCopy } from "@/components/status-copy";
import { draftProblemMessage } from "@/features/blueprint/draft-problem-message";
import {
  draftFromVersion,
  draftProblems,
  emptyDraft,
  errorMessages,
  versionBody,
  type BlueprintDraft,
} from "@/features/blueprint/model";
import { blueprintRepository } from "@/features/blueprint/repository";
import { VersionEditor } from "@/features/blueprint/ui/version-editor";
import { readApiError } from "@/lib/api-errors";
import { dialogActionsClass } from "@/lib/dialog-actions";

export type BlueprintDialogProps = {
  /** Given: add a version to it, starting from its latest. Absent: create a blueprint. */
  blueprint?: PostprocessingBlueprint;
  onClose: () => void;
  onSaved?: (blueprintId: string) => void;
};

/** Mount only while open: the draft starts afresh each time. */
export function BlueprintDialog({ blueprint, onClose, onSaved }: BlueprintDialogProps): ReactElement {
  const { formatMessage } = useIntl();
  const queryClient = useQueryClient();
  const algorithms = useQuery(blueprintRepository.algorithms());
  const [draft, setDraft] = useState<BlueprintDraft>(() =>
    blueprint ? draftFromVersion(blueprint.latest_version) : emptyDraft(),
  );
  const [shown, setShown] = useState<string[]>([]);
  const [nameError, setNameError] = useState<string | undefined>();

  async function saved(blueprintId: string) {
    await queryClient.invalidateQueries({ queryKey: blueprintRepository.listKey() });
    await queryClient.invalidateQueries({ queryKey: blueprintRepository.retrieveKey({ path: { blueprint_id: blueprintId } }) });
    await queryClient.invalidateQueries({ queryKey: blueprintRepository.versionsKey({ path: { blueprint_id: blueprintId } }) });
    onSaved?.(blueprintId);
    onClose();
  }

  function failed(error: unknown) {
    const { status, fields } = readApiError(error);
    if (status === 409) {
      setNameError(
        formatMessage({ id: "feature.blueprint.dialog.nameTaken", defaultMessage: "You already have a blueprint with this name." }),
      );
      setShown([]);
      return;
    }
    setNameError(fields.name);
    const messages = errorMessages(error).filter((message) => message !== fields.name);
    setShown(
      messages.length
        ? messages
        : [formatMessage({ id: "feature.blueprint.dialog.failed", defaultMessage: "The blueprint was not saved. Try again." })],
    );
  }

  const create = useMutation({ ...blueprintRepository.create(), onSuccess: (row) => saved(row.id), onError: failed });
  const addVersion = useMutation({
    ...blueprintRepository.createVersion(),
    onSuccess: (row) => saved(row.blueprint_id),
    onError: failed,
  });
  const pending = create.isPending || addVersion.isPending;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const problems = draftProblems(draft, algorithms.data ?? []);
    if (problems.length) {
      setShown(problems.map((problem) => draftProblemMessage(problem, formatMessage)));
      return;
    }
    setShown([]);
    setNameError(undefined);
    const body = versionBody(draft);
    if (blueprint) {
      addVersion.mutate({ path: { blueprint_id: blueprint.id }, body });
      return;
    }
    const form = new FormData(event.currentTarget);
    create.mutate({
      body: {
        name: String(form.get("name") ?? "").trim(),
        description: String(form.get("description") ?? "").trim() || null,
        is_public: form.get("is_public") === "on",
        inputs: body.inputs,
        steps: body.steps,
      },
    });
  }

  return (
    <Modal
      open
      size="wide"
      title={
        blueprint
          ? formatMessage(
              { id: "feature.blueprint.dialog.versionTitle", defaultMessage: "New version of {name}" },
              { name: blueprint.name },
            )
          : formatMessage({ id: "feature.blueprint.dialog.createTitle", defaultMessage: "New blueprint" })
      }
      description={
        blueprint
          ? formatMessage({
              id: "feature.blueprint.dialog.versionDescription",
              defaultMessage:
                "Versions can't be edited once saved. Devices keep running theirs until you move them; calibrations carry over for steps that keep their name and algorithm.",
            })
          : formatMessage({
              id: "feature.blueprint.dialog.createDescription",
              defaultMessage:
                "A blueprint is a recipe that computes new channels from a device's readings. Create a blueprint here, and then attach it to devices from their page. Calibrations can be added on the device page too.",
            })
      }
      onClose={onClose}
    >
      <form className="flex flex-col gap-6" onSubmit={onSubmit}>
        {blueprint ? null : (
          <FieldGroup>
            <FormField
              id="blueprint-name"
              label={formatMessage({ id: "feature.blueprint.dialog.name", defaultMessage: "Name" })}
              error={nameError}
            >
              <Input id="blueprint-name" name="name" required autoComplete="off" />
            </FormField>
            <FormField
              id="blueprint-description"
              label={formatMessage({ id: "feature.blueprint.dialog.description", defaultMessage: "Description" })}
            >
              <Textarea id="blueprint-description" name="description" />
            </FormField>
            <FormCheckbox
              id="blueprint-public"
              name="is_public"
              label={formatMessage({
                id: "feature.blueprint.dialog.public",
                defaultMessage: "Public: anyone can attach this blueprint to their devices",
              })}
            />
          </FieldGroup>
        )}
        {algorithms.error ? (
          <StatusCopy>
            {formatMessage({
              id: "feature.blueprint.dialog.algorithmsFailed",
              defaultMessage: "The algorithms didn't load. Close this dialog and try again.",
            })}
          </StatusCopy>
        ) : (
          <VersionEditor
            draft={draft}
            algorithms={algorithms.data ?? []}
            onChange={setDraft}
            withNotes={blueprint !== undefined}
          />
        )}
        {shown.length ? (
          <ul className="flex flex-col gap-1" role="status">
            {shown.map((message) => (
              <li key={message} className="text-body-regular text-text-secondary">
                {message}
              </li>
            ))}
          </ul>
        ) : null}
        <div className={dialogActionsClass}>
          <Button type="button" variant="secondary" size="small" onClick={onClose}>
            {formatMessage({ id: "feature.blueprint.dialog.cancel", defaultMessage: "Cancel" })}
          </Button>
          <Button type="submit" size="small" disabled={pending || !algorithms.data}>
            {pending
              ? formatMessage({ id: "feature.blueprint.dialog.saving", defaultMessage: "Saving" })
              : blueprint
                ? formatMessage({ id: "feature.blueprint.dialog.saveVersion", defaultMessage: "Save version" })
                : formatMessage({ id: "feature.blueprint.dialog.create", defaultMessage: "Create blueprint" })}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
