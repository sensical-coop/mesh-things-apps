import { validateBlueprintStep, validateBlueprintVersion } from "@mtt/contracts/blueprint";
import { algorithmNamed } from "../algorithm/catalog";
import type { BlueprintInputRow, BlueprintStepRow } from "./repository";

/** A step against its algorithm's declaration. Calibration params belong to each device, not the recipe. */
export function validateStep(step: BlueprintStepRow): string[] {
  return validateBlueprintStep(step, algorithmNamed(step.function_name));
}

/** How a version's steps reference its slots and each other. */
export function validateVersion(inputs: BlueprintInputRow[], steps: BlueprintStepRow[]): string[] {
  return validateBlueprintVersion(inputs, steps, algorithmNamed);
}

/** DRF's shape for a bad version: per-step serializer errors first, then the cross-step ones. */
export function versionErrors(inputs: BlueprintInputRow[], steps: BlueprintStepRow[]): Record<string, unknown> | null {
  const perStep = steps.map((step) => {
    const errors = validateStep(step);
    return errors.length ? { function_name: errors } : {};
  });
  if (perStep.some((errors) => "function_name" in errors)) return { steps: perStep };
  const errors = validateVersion(inputs, steps);
  return errors.length ? { steps: errors } : null;
}

/** A step's per-device calibration: every required calibration param, and nothing that is configuration. */
export function validateCalibration(functionName: string, params: Record<string, unknown>): string[] {
  const spec = algorithmNamed(functionName);
  if (!spec) return [`Unknown algorithm '${functionName}'.`];
  const errors: string[] = [];
  const given = Object.keys(params);
  const misplaced = spec.params.filter((param) => !param.calibration && given.includes(param.name));
  if (misplaced.length) {
    errors.push(`'${functionName}' param(s) ${misplaced.map((p) => p.name).join(", ")} are configuration, set on the blueprint step`);
  }
  const unknown = given.filter((name) => !spec.params.some((param) => param.name === name));
  if (unknown.length) errors.push(`'${functionName}' does not accept param(s) ${unknown.join(", ")}`);
  const missing = spec.params.filter((param) => param.calibration && param.required && !given.includes(param.name));
  if (missing.length) {
    errors.push(`'${functionName}' requires calibration param(s) ${missing.map((p) => p.name).join(", ")}`);
  }
  return errors;
}
