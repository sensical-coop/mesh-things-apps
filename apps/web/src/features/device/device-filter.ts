import type { DeviceRead, DevicesListParams } from "@mtt/contracts";
import { listQueryBoolean } from "@mtt/contracts/list-filter";
import type { FilterSpec } from "@/components/smart-filters";
import { deviceTitle } from "./model.ts";

type FormatMessage = (descriptor: { id: string; defaultMessage: string }) => string;

const COPY = {
  label: ["feature.device.filters.label", "Label"],
  role: ["feature.device.filters.role", "Role"],
  gateway: ["feature.device.filters.roleGateway", "Gateway"],
  node: ["feature.device.filters.roleNode", "Node"],
  telemetry: ["feature.device.filters.telemetry", "Telemetry"],
} as const;

function text(formatMessage: FormatMessage, pair: readonly [string, string]): string {
  return formatMessage({ id: pair[0], defaultMessage: pair[1] });
}

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
    case "has_postprocessing":
      return undefined;
    default:
      return "";
  }
}

/** `has_postprocessing` is not on the row; the list route takes it as a bare boolean. */
export function deviceListParams(queryString: string): DevicesListParams | undefined {
  const hasPostprocessing = listQueryBoolean(queryString, "has_postprocessing");
  return hasPostprocessing === undefined ? undefined : { has_postprocessing: hasPostprocessing };
}

export function deviceFilterSpecs(input: {
  formatMessage: FormatMessage;
  variantOptions: { value: string; label: string }[];
  meshOptions?: { value: string; label: string }[];
  mesh?: boolean;
  allowed?: boolean;
  /** Blueprint attachment. The list route filters it; the row does not say. */
  blueprint?: boolean;
  /** Archive setting. Only operators receive it on the row. */
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
      label: formatMessage({ id: "feature.device.filters.mesh", defaultMessage: "Mesh" }),
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
      label: formatMessage({ id: "feature.device.filters.allowed", defaultMessage: "Allowed" }),
      type: "select",
      options: [
        { value: "true", label: formatMessage({ id: "feature.device.filters.allowedTrue", defaultMessage: "Allowed" }) },
        { value: "false", label: formatMessage({ id: "feature.device.filters.allowedFalse", defaultMessage: "Blocked" }) },
      ],
    });
  }
  if (input.blueprint) {
    specs.push({
      key: "has_postprocessing",
      urlKey: "has_postprocessing",
      serverOnly: true,
      label: formatMessage({ id: "feature.device.filters.blueprint", defaultMessage: "Blueprint" }),
      type: "select",
      options: [
        {
          value: "true",
          label: formatMessage({ id: "feature.device.filters.blueprintTrue", defaultMessage: "With blueprint" }),
        },
        {
          value: "false",
          label: formatMessage({ id: "feature.device.filters.blueprintFalse", defaultMessage: "Without blueprint" }),
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
      label: formatMessage({ id: "feature.device.filters.s3", defaultMessage: "S3 storage" }),
      type: "select",
      options: [
        { value: "true", label: formatMessage({ id: "feature.device.filters.s3On", defaultMessage: "On" }) },
        { value: "false", label: formatMessage({ id: "feature.device.filters.s3Off", defaultMessage: "Off" }) },
      ],
    });
  }
  return specs;
}
