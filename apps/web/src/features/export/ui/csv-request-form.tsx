import type { Mesh } from "@mtt/contracts";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { Checkbox } from "@mtt/ui/components/ui/checkbox";
import { Field, FieldLabel } from "@mtt/ui/components/ui/field";
import { RiDownloadLine } from "@remixicon/react";
import { useQuery } from "@tanstack/react-query";
import { type FormEvent, type ReactElement, useState } from "react";
import { useIntl } from "react-intl";
import { FormField } from "@/components/form/form-field";
import { FormSelect } from "@/components/form/form-select";
import { deviceTitle } from "@/features/device/model";
import { rangeProblem } from "@/features/export/model";
import type { RequestExportState } from "@/features/export/use-request-export";
import { ExportRangeFields, type ExportRange } from "@/features/export/ui/export-range-fields";
import { meshRepository } from "@/features/mesh/repository";
import { meshTitle } from "@/features/mesh/model";

export type CsvRequestDraft = {
  meshId: string;
  /** Null for every device of the mesh. */
  nodeIds: number[] | null;
  range: ExportRange;
};

export type CsvRequestFormProps = {
  meshes: readonly Mesh[];
  initial: CsvRequestDraft;
  requested: RequestExportState;
};

const NIL_MESH = "00000000-0000-4000-8000-000000000000";

/** A new CSV download: which mesh, all of its devices or some, and which days. */
export function CsvRequestForm({ meshes, initial, requested }: CsvRequestFormProps): ReactElement {
  const { formatMessage } = useIntl();
  const [meshId, setMeshId] = useState(initial.meshId);
  const [nodeIds, setNodeIds] = useState<number[] | null>(initial.nodeIds);
  const [range, setRange] = useState(initial.range);
  const devices = useQuery({ ...meshRepository.devices({ path: { mesh_id: meshId || NIL_MESH } }), enabled: Boolean(meshId) });
  const problem = rangeProblem(range.start, range.stop);
  const noneChosen = nodeIds !== null && nodeIds.length === 0;

  function toggle(node: number, checked: boolean) {
    requested.reset();
    setNodeIds((current) => {
      const next = new Set(current ?? []);
      if (checked) next.add(node);
      else next.delete(node);
      return [...next].sort((a, b) => a - b);
    });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!meshId || problem !== null || noneChosen) return;
    requested.request(meshId, { format: "csv", ...range, ...(nodeIds ? { node_ids: nodeIds } : {}) });
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={onSubmit}>
      <FormField id="csv-mesh" label={formatMessage({ id: "feature.export.form.mesh", defaultMessage: "Mesh" })}>
        <FormSelect
          id="csv-mesh"
          name="mesh"
          required
          value={meshId}
          onValueChange={(next) => {
            requested.reset();
            setMeshId(next);
            setNodeIds(null);
          }}
          placeholder={formatMessage({ id: "feature.export.form.meshPlaceholder", defaultMessage: "Choose a mesh" })}
          items={meshes.map((mesh) => ({ value: mesh.id, label: meshTitle(mesh) }))}
        />
      </FormField>
      {meshId ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-caption-1-medium text-text-secondary">
            {formatMessage({ id: "feature.export.form.devices", defaultMessage: "Devices" })}
          </legend>
          <Field orientation="horizontal">
            <Checkbox
              id="csv-all-devices"
              checked={nodeIds === null}
              onCheckedChange={(checked) => {
                requested.reset();
                setNodeIds(checked ? null : []);
              }}
            />
            <FieldLabel htmlFor="csv-all-devices" className="text-body-regular text-text-primary">
              {formatMessage({ id: "feature.export.form.allDevices", defaultMessage: "Every device of the mesh" })}
            </FieldLabel>
          </Field>
          {nodeIds !== null ? (
            <ul className="oa-squircle-inset flex max-h-56 flex-col gap-2 overflow-y-auto bg-background-secondary-default p-3">
              {(devices.data ?? []).map((device) => (
                <li key={device.uuid}>
                  <Field orientation="horizontal">
                    <Checkbox
                      id={`csv-device-${device.node_id}`}
                      checked={nodeIds.includes(device.node_id)}
                      onCheckedChange={(checked) => toggle(device.node_id, checked === true)}
                    />
                    <FieldLabel htmlFor={`csv-device-${device.node_id}`} className="text-body-regular text-text-primary">
                      {deviceTitle(device)}
                    </FieldLabel>
                  </Field>
                </li>
              ))}
              {devices.data?.length === 0 ? (
                <li className="text-body-regular text-text-tertiary">
                  {formatMessage({ id: "feature.export.form.noDevices", defaultMessage: "This mesh has no devices yet." })}
                </li>
              ) : null}
            </ul>
          ) : null}
          {noneChosen ? (
            <p className="text-caption-1-regular text-text-tertiary">
              {formatMessage({ id: "feature.export.form.chooseDevices", defaultMessage: "Choose at least one device." })}
            </p>
          ) : null}
        </fieldset>
      ) : null}
      <ExportRangeFields
        idPrefix="csv"
        value={range}
        onChange={(next) => {
          requested.reset();
          setRange(next);
        }}
      />
      {requested.error ? (
        <p className="text-body-regular text-text-secondary" role="status">
          {requested.error}
        </p>
      ) : null}
      <div className="flex justify-end">
        <Button
          type="submit"
          size="small"
          leadingIcon={RiDownloadLine}
          disabled={requested.pending || !meshId || problem !== null || noneChosen}
        >
          {requested.pending
            ? formatMessage({ id: "feature.export.device.requesting", defaultMessage: "Requesting" })
            : formatMessage({ id: "feature.export.device.request", defaultMessage: "Prepare CSV" })}
        </Button>
      </div>
    </form>
  );
}
