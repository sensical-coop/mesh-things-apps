import type { Algorithm, AlgorithmParam } from "@mtt/contracts";

export function algorithmOf(algorithms: readonly Algorithm[], name: string): Algorithm | undefined {
  return algorithms.find((candidate) => candidate.name === name);
}

export function paramLabel(param: Pick<AlgorithmParam, "name" | "unit">): string {
  return param.unit ? `${param.name} (${param.unit})` : param.name;
}

/** `name=value` pairs, as a step's or a calibration's params read. */
export function formatParams(params: Record<string, unknown>): string {
  return Object.entries(params)
    .map(([name, value]) => `${name}=${formatParam(value)}`)
    .join("  ");
}

/** A step's `inputs` / `outputs`: `{ name: string }`, which the schema leaves untyped. */
export function stringMap(value: unknown): Record<string, string> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}

/** A step's `params` or a calibration's. */
export function valueMap(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  return { ...value };
}

export function configParams(algorithm: Pick<Algorithm, "params"> | undefined): AlgorithmParam[] {
  return (algorithm?.params ?? []).filter((param) => !param.calibration);
}

export function calibrationParams(algorithm: Pick<Algorithm, "params"> | undefined): AlgorithmParam[] {
  return (algorithm?.params ?? []).filter((param) => param.calibration);
}

export function formatParam(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

/** Typed param text as a value: JSON when it parses (numbers, lists), otherwise the text itself. */
export function parseParam(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
