import {
  algorithmsListOptions,
  postprocessingBlueprintsCreateMutation,
  postprocessingBlueprintsListOptions,
  postprocessingBlueprintsListQueryKey,
} from "@mtt/contracts/query";
import { zPostprocessingBlueprintsCreateData } from "@mtt/contracts/zod";
import { Button } from "@mtt/ui/components/base/buttons/button";
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@mtt/ui/reui/frame";
import { RiAddLine } from "@remixicon/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, type ReactElement, useState } from "react";
import { FieldGroup } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { FormField, FormSelect, Input } from "./form-fields";
import { dialogActionsClass, Modal, pageHeadingClass, SkeletonRows, StatusCopy } from "./widgets";

export function BlueprintsPage(): ReactElement {
  const blueprints = useQuery(postprocessingBlueprintsListOptions());
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className={pageHeadingClass}>
        <h1 className="min-w-0 text-title-2-medium tracking-tight text-text-primary">Blueprints</h1>
        <Button type="button" size="small" leadingIcon={RiAddLine} onClick={() => setOpen(true)}>
          New blueprint
        </Button>
      </div>
      <Frame className="shadow-card">
        <FrameHeader>
          <FrameTitle>Recipes</FrameTitle>
          <FrameDescription>Assign a blueprint on the device page. Algorithms come from GET /algorithms.</FrameDescription>
        </FrameHeader>
        <FramePanel>
          {blueprints.isPending ? <SkeletonRows /> : null}
          {blueprints.data?.length ? (
            <ul className="flex flex-col gap-2 text-body-medium text-text-primary">
              {blueprints.data.map((bp) => (
                <li key={bp.id} className="flex min-w-0 flex-col gap-1 sm:flex-row sm:justify-between sm:gap-3">
                  <span className="min-w-0 break-words">{bp.name}</span>
                  <span className="min-w-0 break-words text-caption-1-regular text-text-secondary sm:text-end">
                    {bp.steps.map((s) => s.function_name).join(", ") || "No steps"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            !blueprints.isPending && <StatusCopy>No blueprints yet.</StatusCopy>
          )}
        </FramePanel>
      </Frame>
      <NewBlueprintDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function NewBlueprintDialog({ open, onClose }: { open: boolean; onClose: () => void }): ReactElement {
  const algorithms = useQuery(algorithmsListOptions());
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const create = useMutation({
    ...postprocessingBlueprintsCreateMutation(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: postprocessingBlueprintsListQueryKey() });
      onClose();
    },
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = zPostprocessingBlueprintsCreateData.safeParse({
      body: {
        name: String(form.get("name") ?? "").trim(),
        description: String(form.get("description") ?? "").trim() || null,
        steps: [
          {
            order: 1,
            function_name: String(form.get("function_name") ?? ""),
            inputs: {},
            params: {},
            outputs: {},
          },
        ],
      },
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid");
      return;
    }
    setError(null);
    create.mutate({ body: parsed.data.body });
  }

  return (
    <Modal
      open={open}
      title="New blueprint"
      description="One step is enough to attach later. Wire inputs on the API if the recipe needs channels."
      onClose={onClose}
    >
      <form className="flex flex-col gap-5" onSubmit={onSubmit}>
        <FieldGroup>
          <FormField id="blueprint-name" label="Name">
            <Input id="blueprint-name" name="name" required autoComplete="off" />
          </FormField>
          <FormField id="blueprint-algorithm" label="Algorithm">
            <FormSelect
              id="blueprint-algorithm"
              name="function_name"
              required
              placeholder="Select algorithm"
              items={(algorithms.data ?? []).map((alg) => ({ label: alg.name, value: alg.name }))}
            />
          </FormField>
          <FormField id="blueprint-description" label="Description">
            <Textarea id="blueprint-description" name="description" />
          </FormField>
        </FieldGroup>
        {error || create.error ? (
          <StatusCopy>{error ?? "The blueprint was not saved. Check the fields and try again."}</StatusCopy>
        ) : null}
        <div className={dialogActionsClass}>
          <Button type="button" variant="secondary" size="small" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="small" disabled={create.isPending}>
            {create.isPending ? "Saving" : "Create blueprint"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
