import type { IntlShape } from "react-intl";
import { readApiError } from "@mtt/contracts/errors";

/** What a failed blueprint save says about its name: taken (409), or the field's own error. */
export function nameErrorMessage(error: unknown, formatMessage: IntlShape["formatMessage"]): string | undefined {
  const { status, fields } = readApiError(error);
  return status === 409
    ? formatMessage({ id: "feature.blueprint.dialog.nameTaken", defaultMessage: "You already have a blueprint with this name." })
    : fields.name;
}
