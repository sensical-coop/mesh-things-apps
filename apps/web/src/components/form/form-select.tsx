import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@mtt/ui/components/ui/select";
import { type ReactElement } from "react";

export type SelectItemOption = { label: string; value: string };

export function FormSelect({
  id,
  name,
  items,
  defaultValue,
  placeholder,
  required,
}: {
  id: string;
  name: string;
  items: readonly SelectItemOption[];
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
}): ReactElement {
  return (
    <Select name={name} defaultValue={defaultValue} items={[...items]} required={required}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder={placeholder} />
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
