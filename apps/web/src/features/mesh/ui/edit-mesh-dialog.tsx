import type { Mesh } from "@mtt/contracts";
import { zMeshesUpdateData } from "@mtt/contracts/zod";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { FieldGroup } from "@mtt/ui/components/ui/field";
import { Input } from "@mtt/ui/components/ui/input";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, type ReactElement, useState } from "react";
import { useIntl } from "react-intl";
import { FormField } from "@/components/form/form-field";
import { Modal } from "@/components/modal";
import { StatusCopy } from "@/components/status-copy";
import { dialogActionsClass } from "@/lib/dialog-actions";
import { meshRepository } from "@/features/mesh/repository";
import { meshTitle } from "@/features/mesh/model";

export function EditMeshDialog({
  mesh,
  open,
  onClose,
  onSaved,
}: {
  mesh: Pick<Mesh, "id" | "label" | "channel_id">;
  open: boolean;
  onClose: () => void;
  onSaved?: () => void | Promise<void>;
}): ReactElement {
  const { formatMessage } = useIntl();
  const queryClient = useQueryClient();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const update = useMutation({
    ...meshRepository.update(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: meshRepository.listKey() });
      await queryClient.invalidateQueries({
        queryKey: meshRepository.retrieveKey({ path: { mesh_id: mesh.id } }),
      });
      await onSaved?.();
      onClose();
    },
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const label = String(form.get("label") ?? "").trim();
    const channelId = String(form.get("channel_id") ?? "").trim();
    const psk = String(form.get("psk_b64") ?? "");
    // psk_b64 is only sent when the owner actually typed a new one — the
    // field starts blank (PSKs aren't echoed back to the client), and
    // MeshUpdate treats an absent key as "leave unchanged".
    const body: { label: string | null; channel_id: string; psk_b64?: string } = {
      label: label === "" ? null : label,
      channel_id: channelId,
    };
    if (psk !== "") body.psk_b64 = psk;
    const parsed = zMeshesUpdateData.safeParse({ path: { mesh_id: mesh.id }, body });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path.at(-1) ?? "form");
        next[key] ??= issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    update.mutate(parsed.data);
  }

  return (
    <Modal
      open={open}
      title={formatMessage(
        { id: "feature.mesh.editDialog.title", defaultMessage: "Edit mesh — {mesh}" },
        { mesh: meshTitle(mesh) },
      )}
      description={formatMessage({
        id: "feature.mesh.editDialog.description",
        defaultMessage: "Label, channel id, and pre-shared key.",
      })}
      onClose={onClose}
    >
      <form key={mesh.id} className="flex flex-col gap-5" onSubmit={onSubmit}>
        <FieldGroup>
          <FormField
            id="mesh-edit-label"
            label={formatMessage({ id: "feature.mesh.editDialog.label", defaultMessage: "Label" })}
            error={errors.label}
          >
            <Input id="mesh-edit-label" name="label" autoComplete="off" defaultValue={mesh.label ?? ""} />
          </FormField>
          <FormField
            id="mesh-edit-channel"
            label={formatMessage({ id: "feature.mesh.editDialog.channelId", defaultMessage: "Channel id" })}
            error={errors.channel_id}
          >
            <Input
              id="mesh-edit-channel"
              name="channel_id"
              required
              autoComplete="off"
              defaultValue={mesh.channel_id}
            />
          </FormField>
          <FormField
            id="mesh-edit-psk"
            label={formatMessage({ id: "feature.mesh.editDialog.psk", defaultMessage: "PSK" })}
            hint={formatMessage({
              id: "feature.mesh.editDialog.pskHint",
              defaultMessage: "Base64 channel key. Leave blank to keep the current key.",
            })}
            error={errors.psk_b64}
          >
            <Input id="mesh-edit-psk" name="psk_b64" type="password" autoComplete="new-password" />
          </FormField>
        </FieldGroup>
        {update.error ? (
          <StatusCopy>
            {formatMessage({
              id: "feature.mesh.editDialog.error",
              defaultMessage: "The mesh was not updated. Check the fields and try again.",
            })}
          </StatusCopy>
        ) : null}
        <div className={dialogActionsClass}>
          <Button type="button" variant="secondary" size="small" onClick={onClose}>
            {formatMessage({ id: "feature.mesh.editDialog.cancel", defaultMessage: "Cancel" })}
          </Button>
          <Button type="submit" size="small" disabled={update.isPending}>
            {update.isPending
              ? formatMessage({ id: "feature.mesh.editDialog.saving", defaultMessage: "Saving" })
              : formatMessage({ id: "feature.mesh.editDialog.save", defaultMessage: "Save mesh" })}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
