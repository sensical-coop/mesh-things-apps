import type { Protocol } from "@mtt/contracts";

/** The versions the API decodes, as `GET /protocols` lists them. */
export const PROTOCOLS: Protocol[] = [
  { version: "2.7", status: "supported", sunset: null, source_ref: "v2.7.26", is_default: false },
  { version: "2.8", status: "current", sunset: null, source_ref: "v2.8.2", is_default: true },
];

export function protocolOf(version: string): Protocol | undefined {
  return PROTOCOLS.find((protocol) => protocol.version === version);
}

/** A version past its sunset is refused, unless the mesh is already on it. */
export function protocolError(version: string | undefined, current: string | null) {
  if (version === undefined || version === current) return null;
  if (protocolOf(version)?.status === "sunset") {
    return { protocol: [`Protocol ${version} is past its sunset and can no longer be chosen.`] };
  }
  return null;
}
