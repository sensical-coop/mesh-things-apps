import type { Mesh } from "@mtt/contracts";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@mtt/ui/components/ui/select";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { meshTitle } from "@/features/mesh/model";

export type MeshPickerProps = {
  meshes: readonly Mesh[];
  value: string;
  onChange: (meshId: string) => void;
};

/** Which mesh a page shows, for pages that work on one mesh at a time. */
export function MeshPicker({ meshes, value, onChange }: MeshPickerProps): ReactElement {
  const { formatMessage } = useIntl();
  const items = meshes.map((mesh) => ({ value: mesh.id, label: meshTitle(mesh) }));

  return (
    <Select items={items} value={value} onValueChange={(next) => typeof next === "string" && onChange(next)}>
      <SelectTrigger
        size="sm"
        className="min-w-48"
        aria-label={formatMessage({ id: "feature.mesh.picker.label", defaultMessage: "Mesh" })}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        <SelectGroup>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
