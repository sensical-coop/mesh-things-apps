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
  value,
  onValueChange,
  placeholder,
  required,
  disabled,
}: {
  id: string;
  name: string;
  items: readonly SelectItemOption[];
  defaultValue?: string;
  /** Controlled use: pass both. */
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}): ReactElement {
  return (
    <Select
      name={name}
      defaultValue={defaultValue}
      value={value}
      onValueChange={onValueChange ? (next) => onValueChange(typeof next === "string" ? next : "") : undefined}
      items={[...items]}
      required={required}
      disabled={disabled}
    >
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
