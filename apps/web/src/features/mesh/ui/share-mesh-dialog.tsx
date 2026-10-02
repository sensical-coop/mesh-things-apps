import type { Mesh, MeshViewer, OwnerPublic } from "@mtt/contracts";
import { zMeshesViewersCreateData } from "@mtt/contracts/zod";
import { Button } from "@mtt/ui/components/base/buttons/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@mtt/ui/components/ui/combobox";
import { FieldGroup } from "@mtt/ui/components/ui/field";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, type ReactElement, useMemo, useState } from "react";
import { useIntl } from "react-intl";
import { FormField } from "@/components/form/form-field";
import { Modal } from "@/components/modal";
import { StatusCopy } from "@/components/status-copy";
import { dialogActionsClass } from "@/lib/dialog-actions";
import { matchesSearch } from "@/lib/search";
import { meshRepository } from "@/features/mesh/repository";
import { meshTitle } from "@/features/mesh/model";

/** The directory can be long; keep the dropdown short and let typing narrow it. */
const MAX_SUGGESTIONS = 8;

type OwnerOption = { label: string; value: string };

export type ShareMeshDialogProps = {
  mesh: Pick<Mesh, "id" | "label" | "channel_id" | "owner_id">;
  owners: readonly OwnerPublic[];
  viewers: readonly MeshViewer[];
  open: boolean;
  onClose: () => void;
};

export function ShareMeshDialog({ mesh, owners, viewers, open, onClose }: ShareMeshDialogProps): ReactElement {
  const { formatMessage } = useIntl();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<OwnerOption | null>(null);
  const [query, setQuery] = useState("");
  const grant = useMutation({
    ...meshRepository.grantViewer(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: meshRepository.viewersKey({ path: { mesh_id: mesh.id } }) });
      close();
    },
  });

  const candidates = useMemo<OwnerOption[]>(() => {
    const invited = new Set(viewers.map((row) => row.viewer.id));
    return owners
      .filter((owner) => owner.id !== mesh.owner_id && !invited.has(owner.id))
      .map((owner) => ({ label: owner.name, value: owner.id }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [owners, viewers, mesh.owner_id]);
  // Once someone is picked the input shows their name; list everyone again rather than just them.
  const search = selected && query === selected.label ? "" : query;
  const matches = useMemo(
    () => candidates.filter((option) => matchesSearch(option.label, search)),
    [candidates, search],
  );
  const suggestions = matches.slice(0, MAX_SUGGESTIONS);

  // Start clean next time the dialog opens.
  function close() {
    setSelected(null);
    setQuery("");
    setError(null);
    grant.reset();
    onClose();
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = zMeshesViewersCreateData.safeParse({
      path: { mesh_id: mesh.id },
      body: { owner_id: selected?.value ?? "" },
    });
    if (!parsed.success) {
      setError(
        formatMessage({ id: "feature.mesh.shareDialog.pickOwner", defaultMessage: "Choose who to share this mesh with." }),
      );
      return;
    }
    setError(null);
    grant.mutate(parsed.data);
  }

  return (
    <Modal
      open={open}
      title={formatMessage(
        { id: "feature.mesh.shareDialog.title", defaultMessage: "Share {mesh}" },
        { mesh: meshTitle(mesh) },
      )}
      description={formatMessage({
        id: "feature.mesh.shareDialog.description",
        defaultMessage:
          "They can view this mesh, its devices, and their readings, but can't change anything. We'll email them.",
      })}
      onClose={close}
    >
      <form key={`${mesh.id}-${open}`} className="flex flex-col gap-5" onSubmit={onSubmit}>
        {candidates.length ? (
          <FieldGroup>
            <FormField
              id="mesh-share-owner"
              label={formatMessage({ id: "feature.mesh.shareDialog.owner", defaultMessage: "Share with" })}
              error={error ?? undefined}
            >
              <Combobox<OwnerOption>
                items={candidates}
                filteredItems={suggestions}
                value={selected}
                onValueChange={(value) => {
                  setSelected(value);
                  setError(null);
                }}
                inputValue={query}
                onInputValueChange={setQuery}
                itemToStringLabel={(option) => option.label}
                itemToStringValue={(option) => option.value}
                isItemEqualToValue={(a, b) => a.value === b.value}
                autoHighlight
              >
                <ComboboxInput
                  id="mesh-share-owner"
                  className="w-full"
                  autoComplete="off"
                  placeholder={formatMessage({
                    id: "feature.mesh.shareDialog.ownerPlaceholder",
                    defaultMessage: "Type a name",
                  })}
                />
                <ComboboxContent>
                  <ComboboxEmpty>
                    {formatMessage({
                      id: "feature.mesh.shareDialog.noMatches",
                      defaultMessage: "Nobody matches that name.",
                    })}
                  </ComboboxEmpty>
                  <ComboboxList>
                    {(option: OwnerOption) => (
                      <ComboboxItem key={option.value} value={option}>
                        {option.label}
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                  {matches.length > suggestions.length ? (
                    <p className="border-t border-separator-border px-3 py-2 text-caption-1-regular text-text-tertiary">
                      {formatMessage(
                        {
                          id: "feature.mesh.shareDialog.moreMatches",
                          defaultMessage: "{shown} of {total} shown. Keep typing to narrow it down.",
                        },
                        { shown: suggestions.length, total: matches.length },
                      )}
                    </p>
                  ) : null}
                </ComboboxContent>
              </Combobox>
            </FormField>
          </FieldGroup>
        ) : (
          <StatusCopy>
            {formatMessage({
              id: "feature.mesh.shareDialog.noCandidates",
              defaultMessage: "There's nobody else to share this mesh with yet.",
            })}
          </StatusCopy>
        )}
        {grant.error ? (
          <StatusCopy>
            {formatMessage({
              id: "feature.mesh.shareDialog.error",
              defaultMessage: "The mesh was not shared. Try again.",
            })}
          </StatusCopy>
        ) : null}
        <div className={dialogActionsClass}>
          <Button type="button" variant="secondary" size="small" onClick={close}>
            {formatMessage({ id: "feature.mesh.shareDialog.cancel", defaultMessage: "Cancel" })}
          </Button>
          <Button type="submit" size="small" disabled={grant.isPending || !candidates.length || !selected}>
            {grant.isPending
              ? formatMessage({ id: "feature.mesh.shareDialog.sharing", defaultMessage: "Sharing" })
              : formatMessage({ id: "feature.mesh.shareDialog.submit", defaultMessage: "Share mesh" })}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
