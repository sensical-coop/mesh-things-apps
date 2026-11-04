export type TermsLocale = "en" | "es";

/** The API serves `en` and `es`; any other console language gets English. */
export function termsLocale(intlLocale: string): TermsLocale {
  return intlLocale.toLowerCase().startsWith("es") ? "es" : "en";
}

/** Every statement the API sent must be ticked; an empty list accepts nothing. */
export function allStatementsAccepted(statementIds: readonly string[], accepted: ReadonlySet<string>): boolean {
  return statementIds.length > 0 && statementIds.every((id) => accepted.has(id));
}

/**
 * Whether this instance asks for terms, from the answer to `GET /terms`. A self-hosted
 * instance answers 404. Unknown (still loading, or another error) is `undefined`.
 */
export function termsEnforcedFrom(state: { loaded: boolean; errorStatus: number | undefined }): boolean | undefined {
  if (state.loaded) return true;
  if (state.errorStatus === 404) return false;
  return undefined;
}
