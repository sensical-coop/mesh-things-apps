import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { FormField } from "./form-field";
import { FormSelect } from "./form-select";

/** A version from `GET /protocols`. */
export type ProtocolOption = {
  version: string;
  status: "current" | "supported" | "deprecated" | "sunset";
  is_default: boolean;
};

/**
 * Versions a mesh can be declared on: every one not past its sunset, plus the one it
 * is already on, which the API keeps accepting.
 */
export function selectableProtocols<T extends Pick<ProtocolOption, "version" | "status">>(
  protocols: readonly T[],
  current: string | null,
): T[] {
  return protocols.filter((protocol) => protocol.status !== "sunset" || protocol.version === current);
}

export type ProtocolFieldProps = {
  id: string;
  /** Undefined while the list loads. */
  protocols: readonly ProtocolOption[] | undefined;
  /** The mesh's version when editing, null when creating. */
  current: string | null;
  /** Null until one is picked: shows the mesh's version, or the default for a new mesh. */
  value: string | null;
  onValueChange: (version: string) => void;
  error?: string;
};

/** The Meshtastic protocol select for a mesh. */
export function ProtocolField({ id, protocols, current, value, onValueChange, error }: ProtocolFieldProps): ReactElement {
  const { formatMessage } = useIntl();
  const statusLabel = {
    current: formatMessage({ id: "feature.mesh.protocolStatus.current", defaultMessage: "Current" }),
    supported: formatMessage({ id: "feature.mesh.protocolStatus.supported", defaultMessage: "Supported" }),
    deprecated: formatMessage({ id: "feature.mesh.protocolStatus.deprecated", defaultMessage: "Deprecated" }),
    sunset: formatMessage({ id: "feature.mesh.protocolStatus.sunset", defaultMessage: "Past its sunset" }),
  };
  const items = selectableProtocols(protocols ?? [], current).map((protocol) => ({
    label: `${protocol.version} · ${statusLabel[protocol.status]}`,
    value: protocol.version,
  }));
  const fallback = current ?? protocols?.find((protocol) => protocol.is_default)?.version ?? "";
  return (
    <FormField
      id={id}
      label={formatMessage({ id: "feature.mesh.protocolField.label", defaultMessage: "Meshtastic protocol" })}
      hint={formatMessage({
        id: "feature.mesh.protocolField.hint",
        defaultMessage:
          "The firmware version this mesh's devices run. Packets are decoded with it, and readings keep the same units whatever the version.",
      })}
      error={error}
    >
      {protocols ? (
        <FormSelect id={id} name="protocol" items={items} value={value ?? fallback} onValueChange={onValueChange} />
      ) : (
        <p className="text-body-regular text-text-secondary" role="status">
          {formatMessage({ id: "feature.mesh.protocolField.loading", defaultMessage: "Loading protocols" })}
        </p>
      )}
    </FormField>
  );
}
