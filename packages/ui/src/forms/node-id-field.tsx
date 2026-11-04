import { Input } from "@mtt/ui/components/ui/input";
import { type ReactElement, useState } from "react";
import { FormField } from "@mtt/ui/forms/form-field";
import { FormSelect } from "@mtt/ui/forms/form-select";
import { formatNodeId, type NodeIdFormat, parseNodeId } from "@mtt/ui/forms/node-id";

export type NodeIdFieldLabels = {
  label: string;
  hint: string;
  decimal: string;
  hex: string;
  invalidHex: string;
  invalidDecimal: string;
  /** `{value}` is the other format. */
  asDecimal: (value: string) => string;
  asHex: (value: string) => string;
};

export function NodeIdField({
  id,
  name,
  error,
  labels,
}: {
  id: string;
  /** Submitted as a hidden input, always in decimal. */
  name: string;
  error?: string;
  labels: NodeIdFieldLabels;
}): ReactElement {
  const [format, setFormat] = useState<NodeIdFormat>("decimal");
  const [raw, setRaw] = useState("");
  const value = parseNodeId(raw, format);
  const typed = raw.trim().replace(/^!/, "") !== "";
  const describedBy = [labels.hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;

  function onFormatChange(next: string) {
    const nextFormat: NodeIdFormat = next === "hex" ? "hex" : "decimal";
    // Carry a valid id across; otherwise start the hex field with Meshtastic's "!".
    setRaw(value !== null ? formatNodeId(value, nextFormat) : nextFormat === "hex" ? "!" : "");
    setFormat(nextFormat);
  }

  return (
    <FormField id={id} label={labels.label} hint={labels.hint} error={error}>
      <div className="flex items-center gap-2">
        <div className="w-32 shrink-0">
          <FormSelect
            id={`${id}-format`}
            name={`${name}_format`}
            items={[
              { value: "decimal", label: labels.decimal },
              { value: "hex", label: labels.hex },
            ]}
            value={format}
            onValueChange={onFormatChange}
          />
        </div>
        <Input
          id={id}
          value={raw}
          onChange={(event) => setRaw(event.target.value)}
          required
          autoComplete="off"
          spellCheck={false}
          inputMode={format === "decimal" ? "numeric" : "text"}
          placeholder={format === "decimal" ? "2130636288" : "!7efeee00"}
          aria-invalid={error || (typed && value === null) ? true : undefined}
          aria-describedby={describedBy}
          className="min-w-0 flex-1 font-mono tabular-nums"
        />
        <input type="hidden" name={name} value={value ?? ""} />
      </div>
      {typed ? (
        <p className="text-caption-1-regular text-text-tertiary tabular-nums" aria-live="polite">
          {value === null
            ? format === "hex"
              ? labels.invalidHex
              : labels.invalidDecimal
            : format === "hex"
              ? labels.asDecimal(formatNodeId(value, "decimal"))
              : labels.asHex(formatNodeId(value, "hex"))}
        </p>
      ) : null}
    </FormField>
  );
}
