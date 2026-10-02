import type { PostprocessingBlueprint } from "@mtt/contracts";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { FieldGroup } from "@mtt/ui/components/ui/field";
import { Input } from "@mtt/ui/components/ui/input";
import { Textarea } from "@mtt/ui/components/ui/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, type ReactElement, useState } from "react";
import { useIntl } from "react-intl";
import { FormCheckbox } from "@/components/form/form-checkbox";
import { FormField } from "@/components/form/form-field";
import { Modal } from "@/components/modal";
import { StatusCopy } from "@/components/status-copy";
import { blueprintRepository } from "@/features/blueprint/repository";
import { formLevelMessage, readApiError } from "@/lib/api-errors";
import { dialogActionsClass } from "@/lib/dialog-actions";

export type BlueprintDetailsDialogProps = {
  blueprint: PostprocessingBlueprint | null;
  onClose: () => void;
};

/** Name, description and visibility: the only things a blueprint changes in place. */
export function BlueprintDetailsDialog({ blueprint, onClose }: BlueprintDetailsDialogProps): ReactElement {
  const { formatMessage } = useIntl();
  const queryClient = useQueryClient();
  const [nameError, setNameError] = useState<string | undefined>();
  const update = useMutation({
    ...blueprintRepository.update(),
    onSuccess: async (row) => {
      await queryClient.invalidateQueries({ queryKey: blueprintRepository.listKey() });
      await queryClient.invalidateQueries({ queryKey: blueprintRepository.retrieveKey({ path: { blueprint_id: row.id } }) });
      onClose();
    },
    onError: (error) => {
      const { status, fields } = readApiError(error);
      setNameError(
        status === 409
          ? formatMessage({ id: "feature.blueprint.dialog.nameTaken", defaultMessage: "You already have a blueprint with this name." })
          : fields.name,
      );
    },
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!blueprint) return;
    const form = new FormData(event.currentTarget);
    setNameError(undefined);
    update.mutate({
      path: { blueprint_id: blueprint.id },
      body: {
        name: String(form.get("name") ?? "").trim(),
        description: String(form.get("description") ?? "").trim() || null,
        is_public: form.get("is_public") === "on",
      },
    });
  }

  return (
    <Modal
      open={blueprint !== null}
      title={formatMessage({ id: "feature.blueprint.detailsDialog.title", defaultMessage: "Edit blueprint" })}
      description={formatMessage({
        id: "feature.blueprint.detailsDialog.description",
        defaultMessage: "To change inputs or steps, add a version instead.",
      })}
      onClose={onClose}
    >
      {blueprint ? (
        <form key={blueprint.id} className="flex flex-col gap-5" onSubmit={onSubmit}>
          <FieldGroup>
            <FormField
              id="blueprint-edit-name"
              label={formatMessage({ id: "feature.blueprint.dialog.name", defaultMessage: "Name" })}
              error={nameError}
            >
              <Input id="blueprint-edit-name" name="name" required autoComplete="off" defaultValue={blueprint.name} />
            </FormField>
            <FormField
              id="blueprint-edit-description"
              label={formatMessage({ id: "feature.blueprint.dialog.description", defaultMessage: "Description" })}
            >
              <Textarea id="blueprint-edit-description" name="description" defaultValue={blueprint.description ?? ""} />
            </FormField>
            <FormCheckbox
              id="blueprint-edit-public"
              name="is_public"
              defaultChecked={blueprint.is_public}
              label={formatMessage({
                id: "feature.blueprint.dialog.public",
                defaultMessage: "Public: anyone can attach it to their devices",
              })}
            />
          </FieldGroup>
          {update.error && !nameError ? (
            <StatusCopy>
              {formatMessage({ id: "feature.blueprint.detailsDialog.failed", defaultMessage: "The blueprint was not saved." })}
              {formLevelMessage(update.error) ? ` ${formLevelMessage(update.error)}` : ""}
            </StatusCopy>
          ) : null}
          <div className={dialogActionsClass}>
            <Button type="button" variant="secondary" size="small" onClick={onClose}>
              {formatMessage({ id: "feature.blueprint.dialog.cancel", defaultMessage: "Cancel" })}
            </Button>
            <Button type="submit" size="small" disabled={update.isPending}>
              {update.isPending
                ? formatMessage({ id: "feature.blueprint.dialog.saving", defaultMessage: "Saving" })
                : formatMessage({ id: "feature.blueprint.detailsDialog.save", defaultMessage: "Save" })}
            </Button>
          </div>
        </form>
      ) : null}
    </Modal>
  );
}
