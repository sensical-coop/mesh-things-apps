import type { IntlShape } from "react-intl";
import type { DraftProblem } from "@/features/blueprint/model";

export function draftProblemMessage(problem: DraftProblem, formatMessage: IntlShape["formatMessage"]): string {
  switch (problem.kind) {
    case "noSteps":
      return formatMessage({ id: "feature.blueprint.problem.noSteps", defaultMessage: "Add at least one step." });
    case "slotName":
      return formatMessage(
        {
          id: "feature.blueprint.problem.slotName",
          defaultMessage: "Input “{slot}”: use lowercase letters, digits and underscores, starting with a letter.",
        },
        { slot: problem.slot },
      );
    case "slotTwice":
      return formatMessage(
        { id: "feature.blueprint.problem.slotTwice", defaultMessage: "Input “{slot}” is declared twice." },
        { slot: problem.slot },
      );
    case "slotUnused":
      return formatMessage(
        { id: "feature.blueprint.problem.slotUnused", defaultMessage: "Input “{slot}” isn't read by any step. Use it or remove it." },
        { slot: problem.slot },
      );
    case "stepKey":
      return formatMessage(
        {
          id: "feature.blueprint.problem.stepKey",
          defaultMessage: "Step “{key}”: use lowercase letters, digits and underscores, starting with a letter.",
        },
        { key: problem.key },
      );
    case "stepKeyTwice":
      return formatMessage(
        { id: "feature.blueprint.problem.stepKeyTwice", defaultMessage: "Two steps are called “{key}”." },
        { key: problem.key },
      );
    case "inputUnset":
      return formatMessage(
        {
          id: "feature.blueprint.problem.inputUnset",
          defaultMessage: "Step “{key}”: choose what feeds “{input}”.",
        },
        { key: problem.key, input: problem.input },
      );
    case "paramRequired":
      return formatMessage(
        { id: "feature.blueprint.problem.paramRequired", defaultMessage: "Step “{key}” needs “{param}”." },
        { key: problem.key, param: problem.param },
      );
    case "noOutput":
      return formatMessage(
        { id: "feature.blueprint.problem.noOutput", defaultMessage: "Step “{key}” needs at least one output name." },
        { key: problem.key },
      );
    case "fieldName":
      return formatMessage(
        {
          id: "feature.blueprint.problem.fieldName",
          defaultMessage: "Step “{key}”: output “{field}” must be lowercase letters, digits and underscores.",
        },
        { key: problem.key, field: problem.field },
      );
    case "fieldTwice":
      return formatMessage(
        { id: "feature.blueprint.problem.fieldTwice", defaultMessage: "Output “{field}” is written by two steps." },
        { field: problem.field },
      );
    case "pointwise":
      return formatMessage(
        {
          id: "feature.blueprint.problem.pointwise",
          defaultMessage: "Step “{key}”: “{name}” is {mode}. Only pointwise algorithms can run.",
        },
        { key: problem.key, name: problem.name, mode: problem.mode },
      );
    case "duplicateOrder":
      return formatMessage({
        id: "feature.blueprint.problem.duplicateOrder",
        defaultMessage: "Each step needs its own order.",
      });
    case "unknownAlgorithm":
      return formatMessage(
        { id: "feature.blueprint.problem.unknownAlgorithm", defaultMessage: "Step “{key}”: “{name}” is not an algorithm." },
        { key: problem.key, name: problem.name },
      );
    case "extraInput":
      return formatMessage(
        {
          id: "feature.blueprint.problem.extraInput",
          defaultMessage: "Step “{key}”: “{input}” is not an input of this algorithm.",
        },
        { key: problem.key, input: problem.input },
      );
    case "calibrationParam":
      return formatMessage(
        {
          id: "feature.blueprint.problem.calibrationParam",
          defaultMessage: "Step “{key}”: “{param}” is set on each device, not on the blueprint.",
        },
        { key: problem.key, param: problem.param },
      );
    case "extraParam":
      return formatMessage(
        {
          id: "feature.blueprint.problem.extraParam",
          defaultMessage: "Step “{key}”: “{param}” is not a parameter of this algorithm.",
        },
        { key: problem.key, param: problem.param },
      );
    case "extraOutput":
      return formatMessage(
        {
          id: "feature.blueprint.problem.extraOutput",
          defaultMessage: "Step “{key}”: “{output}” is not an output of this algorithm.",
        },
        { key: problem.key, output: problem.output },
      );
  }
}
