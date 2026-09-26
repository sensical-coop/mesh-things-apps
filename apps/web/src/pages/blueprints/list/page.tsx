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
import { useIntl } from "react-intl";
import { FieldGroup } from "@mtt/ui/components/ui/field";
import { Textarea } from "@mtt/ui/components/ui/textarea";
import { FormField } from "@/components/form/form-field";
import { FormSelect } from "@/components/form/form-select";
import { Input } from "@mtt/ui/components/ui/input";
import { dialogActionsClass } from "@/lib/dialog-actions";
import { pageHeadingClass } from "@/lib/page-heading";
import { Modal } from "@/components/modal";
import { SkeletonRows } from "@/components/skeleton-rows";
import { StatusCopy } from "@/components/status-copy";
import { formLevelMessage, readApiError } from "@/lib/api-errors";
import { blueprintRepository } from "@/features/blueprint/repository";

export function BlueprintsPage(): ReactElement {
  const { formatMessage } = useIntl();
  const blueprints = useQuery(blueprintRepository.list());
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className={pageHeadingClass}>
        <h1 className="min-w-0 text-title-2-medium tracking-tight text-text-primary">
          {formatMessage({ id: "page.blueprints.list.title", defaultMessage: "Blueprints" })}
        </h1>
        <Button type="button" size="small" leadingIcon={RiAddLine} onClick={() => setOpen(true)}>
          {formatMessage({ id: "page.blueprints.list.newBlueprint", defaultMessage: "New blueprint" })}
        </Button>
      </div>
      <Frame className="shadow-card">
        <FrameHeader>
          <FrameTitle>{formatMessage({ id: "page.blueprints.list.panel.title", defaultMessage: "Recipes" })}</FrameTitle>
          <FrameDescription>
            {formatMessage({
              id: "page.blueprints.list.panel.description",
              defaultMessage: "Assign a blueprint on the device page. Algorithms come from GET /algorithms.",
            })}
          </FrameDescription>
        </FrameHeader>
        <FramePanel>
          {blueprints.isPending ? <SkeletonRows /> : null}
          {blueprints.data?.length ? (
            <ul className="flex flex-col gap-2 text-body-medium text-text-primary">
              {blueprints.data.map((bp) => (
                <li key={bp.id} className="flex min-w-0 flex-col gap-1 sm:flex-row sm:justify-between sm:gap-3">
                  <span className="min-w-0 break-words">{bp.name}</span>
                  <span className="min-w-0 break-words text-caption-1-regular text-text-secondary sm:text-end">
                    {bp.steps.map((s) => s.function_name).join(", ") ||
                      formatMessage({ id: "page.blueprints.list.noSteps", defaultMessage: "No steps" })}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            !blueprints.isPending && (
              <StatusCopy>
                {formatMessage({ id: "page.blueprints.list.none", defaultMessage: "No blueprints yet." })}
              </StatusCopy>
            )
          )}
        </FramePanel>
      </Frame>
      <NewBlueprintDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function NewBlueprintDialog({ open, onClose }: { open: boolean; onClose: () => void }): ReactElement {
  const { formatMessage } = useIntl();
  const algorithms = useQuery(blueprintRepository.algorithms());
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const create = useMutation({
    ...blueprintRepository.create(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: blueprintRepository.listKey() });
      onClose();
    },
    onError: (failure) => setFieldErrors(readApiError(failure).fields),
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
      setError(
        parsed.error.issues[0]?.message ??
          formatMessage({ id: "page.blueprints.list.createDialog.invalid", defaultMessage: "Invalid" }),
      );
      return;
    }
    setError(null);
    setFieldErrors({});
    create.mutate({ body: parsed.data.body });
  }

  return (
    <Modal
      open={open}
      title={formatMessage({ id: "page.blueprints.list.createDialog.title", defaultMessage: "New blueprint" })}
      description={formatMessage({
        id: "page.blueprints.list.createDialog.description",
        defaultMessage: "One step is enough to attach later. Wire inputs on the API if the recipe needs channels.",
      })}
      onClose={onClose}
    >
      <form className="flex flex-col gap-5" onSubmit={onSubmit}>
        <FieldGroup>
          <FormField
            id="blueprint-name"
            label={formatMessage({ id: "page.blueprints.list.createDialog.name", defaultMessage: "Name" })}
            error={fieldErrors.name}
          >
            <Input id="blueprint-name" name="name" required autoComplete="off" />
          </FormField>
          <FormField
            id="blueprint-algorithm"
            label={formatMessage({ id: "page.blueprints.list.createDialog.algorithm", defaultMessage: "Algorithm" })}
            error={fieldErrors.function_name ?? fieldErrors.steps}
          >
            <FormSelect
              id="blueprint-algorithm"
              name="function_name"
              required
              placeholder={formatMessage({
                id: "page.blueprints.list.createDialog.algorithmPlaceholder",
                defaultMessage: "Select algorithm",
              })}
              items={(algorithms.data ?? []).map((alg) => ({ label: alg.name, value: alg.name }))}
            />
          </FormField>
          <FormField
            id="blueprint-description"
            label={formatMessage({
              id: "page.blueprints.list.createDialog.descriptionField",
              defaultMessage: "Description",
            })}
            error={fieldErrors.description}
          >
            <Textarea id="blueprint-description" name="description" />
          </FormField>
        </FieldGroup>
        {error || create.error ? (
          <StatusCopy>
            {error ??
              formatMessage({
                id: "page.blueprints.list.createDialog.error",
                defaultMessage: "The blueprint was not saved. Check the fields and try again.",
              })}
            {!error && formLevelMessage(create.error) ? ` ${formLevelMessage(create.error)}` : ""}
          </StatusCopy>
        ) : null}
        <div className={dialogActionsClass}>
          <Button type="button" variant="secondary" size="small" onClick={onClose}>
            {formatMessage({ id: "page.blueprints.list.createDialog.cancel", defaultMessage: "Cancel" })}
          </Button>
          <Button type="submit" size="small" disabled={create.isPending}>
            {create.isPending
              ? formatMessage({ id: "page.blueprints.list.createDialog.saving", defaultMessage: "Saving" })
              : formatMessage({
                  id: "page.blueprints.list.createDialog.create",
                  defaultMessage: "Create blueprint",
                })}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
