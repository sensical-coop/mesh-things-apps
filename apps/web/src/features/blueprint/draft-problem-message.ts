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
  }
}
