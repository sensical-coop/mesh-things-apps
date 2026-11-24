import { type ApiError, readApiError } from "@mtt/contracts/errors";
import type { IntlShape } from "react-intl";

/** Why accepting terms failed: they changed while the dialog was open, else whatever `otherwise` says. */
export function termsAcceptError(
  error: unknown,
  formatMessage: IntlShape["formatMessage"],
  otherwise: (failure: ApiError) => string,
): string | null {
  if (!error) return null;
  const failure = readApiError(error);
  return failure.fields.terms_version
    ? formatMessage({
        id: "feature.terms.renew.outdated",
        defaultMessage: "The terms changed while you were reading. Close and open them again.",
      })
    : otherwise(failure);
}
