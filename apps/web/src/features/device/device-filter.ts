import type { DeviceRead } from "@mtt/contracts";
import type { FilterSpec } from "@/components/smart-filters";
import { deviceTitle } from "./model";

type FormatMessage = (descriptor: { id: string; defaultMessage: string }) => string;

const COPY = {
  label: ["page.devices.list.filters.label", "Label"],
  role: ["page.devices.list.filters.role", "Role"],
  gateway: ["page.devices.list.filters.roleGateway", "Gateway"],
  node: ["page.devices.list.filters.roleNode", "Node"],
  telemetry: ["page.devices.list.filters.telemetry", "Telemetry"],
} as const;

function text(formatMessage: FormatMessage, pair: readonly [string, string]): string {
  return formatMessage({ id: pair[0], defaultMessage: pair[1] });
}

/** Row value for the device-list filters. Unknown fields are ignored (server-side filters). */
export function deviceFilterValue(device: DeviceRead, field: string): string | readonly string[] | undefined {
  switch (field) {
    case "label":
      return deviceTitle(device);
    case "mesh_id":
      return device.mesh_id;
    case "is_gateway":
      return String(device.is_gateway);
    case "is_allowed":
      return String(device.is_allowed);
    case "telemetry_variant":
      return device.telemetry_variant_ids;
    case "archive_enabled":
      return device.archive_enabled === undefined ? "" : String(device.archive_enabled);
    default:
      return undefined;
  }
}

/** The device-list filter fields. */
export function deviceFilterSpecs(input: {
  formatMessage: FormatMessage;
  variantOptions: { value: string; label: string }[];
  meshOptions?: { value: string; label: string }[];
  mesh?: boolean;
  allowed?: boolean;
  blueprint?: boolean;
  archive?: boolean;
}): FilterSpec[] {
  const { formatMessage, variantOptions } = input;
  const say = (pair: readonly [string, string]) => text(formatMessage, pair);
  const specs: FilterSpec[] = [
    { key: "label", urlKey: "label", label: say(COPY.label), type: "text" },
  ];
  if (input.mesh) {
    specs.push({
      key: "mesh_id",
      urlKey: "mesh_id",
      label: formatMessage({ id: "page.devices.list.filters.mesh", defaultMessage: "Mesh" }),
      type: "select",
      options: input.meshOptions ?? [],
    });
  }
  specs.push({
    key: "is_gateway",
    urlKey: "is_gateway",
    label: say(COPY.role),
    type: "select",
    options: [
      { value: "true", label: say(COPY.gateway) },
      { value: "false", label: say(COPY.node) },
    ],
  });
  if (input.allowed) {
    specs.push({
      key: "is_allowed",
      urlKey: "is_allowed",
      label: formatMessage({ id: "page.devices.list.filters.allowed", defaultMessage: "Allowed" }),
      type: "select",
      options: [
        { value: "true", label: formatMessage({ id: "page.devices.list.filters.allowedTrue", defaultMessage: "Allowed" }) },
        { value: "false", label: formatMessage({ id: "page.devices.list.filters.allowedFalse", defaultMessage: "Blocked" }) },
      ],
    });
  }
  if (input.blueprint) {
    specs.push({
      key: "has_postprocessing",
      urlKey: "has_postprocessing",
      label: formatMessage({ id: "page.devices.list.filters.blueprint", defaultMessage: "Blueprint" }),
      type: "select",
      options: [
        {
          value: "true",
          label: formatMessage({ id: "page.devices.list.filters.blueprintTrue", defaultMessage: "With blueprint" }),
        },
        {
          value: "false",
          label: formatMessage({ id: "page.devices.list.filters.blueprintFalse", defaultMessage: "Without blueprint" }),
        },
      ],
    });
  }
  if (variantOptions.length) {
    specs.push({
      key: "telemetry_variant",
      urlKey: "telemetry",
      label: say(COPY.telemetry),
      type: "multiselect",
      options: variantOptions,
    });
  }
  if (input.archive) {
    specs.push({
      key: "archive_enabled",
      urlKey: "s3",
      label: formatMessage({ id: "page.devices.list.filters.s3", defaultMessage: "S3 storage" }),
      type: "select",
      options: [
        { value: "true", label: formatMessage({ id: "page.devices.list.filters.s3On", defaultMessage: "On" }) },
        { value: "false", label: formatMessage({ id: "page.devices.list.filters.s3Off", defaultMessage: "Off" }) },
      ],
    });
  }
  return specs;
}
