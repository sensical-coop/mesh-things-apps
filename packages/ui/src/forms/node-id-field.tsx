import { Input } from "@mtt/ui/components/ui/input";
import { type ReactElement, useState } from "react";
import { useIntl } from "react-intl";
import { FormField } from "@mtt/ui/forms/form-field";
import { FormSelect } from "@mtt/ui/forms/form-select";
import { formatNodeId, looksHex, type NodeIdFormat, parseNodeId } from "@mtt/ui/forms/node-id";

export function NodeIdField({
  id,
  name,
  error,
}: {
  id: string;
  /** Submitted as a hidden input, always in decimal. */
  name: string;
  error?: string;
}): ReactElement {
  const { formatMessage } = useIntl();
  const hint = formatMessage({
    id: "feature.device.nodeIdField.hint",
    defaultMessage: "The node number as Meshtastic shows it: decimal (2130636288) or hex (!7efeee00).",
  });
  const [format, setFormat] = useState<NodeIdFormat>("decimal");
  const [raw, setRaw] = useState("");
  const value = parseNodeId(raw, format);
  const typed = raw.trim().replace(/^!/, "") !== "";
  const describedBy = [`${id}-hint`, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;

  function onFormatChange(next: string) {
    const nextFormat: NodeIdFormat = next === "hex" ? "hex" : "decimal";
    // Carry a valid id across; otherwise start the hex field with Meshtastic's "!".
    setRaw(value !== null ? formatNodeId(value, nextFormat) : nextFormat === "hex" ? "!" : "");
    setFormat(nextFormat);
  }

  function onInput(text: string) {
    // An id copied from the Meshtastic app is hex, whichever format is selected.
    if (format === "decimal" && looksHex(text)) setFormat("hex");
    setRaw(text);
  }

  return (
    <FormField
      id={id}
      label={formatMessage({ id: "feature.device.nodeIdField.label", defaultMessage: "Node ID" })}
      hint={hint}
      error={error}
    >
      <div className="flex items-center gap-2">
        <div className="w-32 shrink-0">
          <FormSelect
            id={`${id}-format`}
            name={`${name}_format`}
            items={[
              { value: "decimal", label: formatMessage({ id: "feature.device.nodeIdField.decimal", defaultMessage: "Decimal" }) },
              { value: "hex", label: formatMessage({ id: "feature.device.nodeIdField.hex", defaultMessage: "Hex (!)" }) },
            ]}
            value={format}
            onValueChange={onFormatChange}
          />
        </div>
        <Input
          id={id}
          value={raw}
          onChange={(event) => onInput(event.target.value)}
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
              ? formatMessage({
                  id: "feature.device.nodeIdField.invalidHex",
                  defaultMessage: "Enter up to 8 hex digits after the !.",
                })
              : formatMessage({
                  id: "feature.device.nodeIdField.invalidDecimal",
                  defaultMessage: "Enter a whole number from 0 to 4294967295.",
                })
            : format === "hex"
              ? formatMessage(
                  { id: "feature.device.nodeIdField.asDecimal", defaultMessage: "Decimal: {value}" },
                  { value: formatNodeId(value, "decimal") },
                )
              : formatMessage(
                  { id: "feature.device.nodeIdField.asHex", defaultMessage: "Hex: {value}" },
                  { value: formatNodeId(value, "hex") },
                )}
        </p>
      ) : null}
    </FormField>
  );
}
