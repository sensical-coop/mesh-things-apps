/** Account terms at signup; mesh terms per mesh on the default broker; source terms per source. */
export type TermsKind = "account" | "mesh" | "source";

export type TermsLocale = "en" | "es";

/** What was accepted: sent back as `terms_version` and `terms_locale`. */
export type TermsAcceptance = { version: string; locale: TermsLocale };

/** Mirrors the API's REGISTRY__TERMS_RENEWAL_NOTICE_DAYS default: when renewal is offered early. */
export const TERMS_RENEWAL_NOTICE_DAYS = 30;

/** The API serves `en` and `es`; any other console language gets English. */
export function termsLocale(intlLocale: string): TermsLocale {
  return intlLocale.toLowerCase().startsWith("es") ? "es" : "en";
}

/** Every statement the API sent must be ticked; an empty list accepts nothing. */
export function allStatementsAccepted(statementIds: readonly string[], accepted: ReadonlySet<string>): boolean {
  return statementIds.length > 0 && statementIds.every((id) => accepted.has(id));
}

/**
 * Where an acceptance stands (a mesh's, a source's, or an owner's account terms,
 * which never lapse):
 * - `lapsed`: paused, or past its expiry; data is no longer stored until renewed;
 * - `none`: nothing on record (accounts made outside signup, meshes made before per-mesh terms);
 * - `outdated`: accepted an older version of the terms;
 * - `expiring`: lapses within the notice period;
 * - `ok`.
 */
export type TermsStanding = "ok" | "expiring" | "outdated" | "none" | "lapsed";

export function termsStanding(input: {
  acceptedVersion: string | null;
  expiresAt: string | null;
  pausedAt: string | null;
  currentVersion: string | undefined;
  now: Date;
}): TermsStanding {
  const expires = input.expiresAt ? new Date(input.expiresAt).getTime() : null;
  const now = input.now.getTime();
  if (input.pausedAt || (expires !== null && expires <= now)) return "lapsed";
  if (!input.acceptedVersion) return "none";
  if (input.currentVersion && input.acceptedVersion !== input.currentVersion) return "outdated";
  if (expires !== null && expires - now <= TERMS_RENEWAL_NOTICE_DAYS * 86_400_000) return "expiring";
  return "ok";
}

/**
 * Whether this instance asks for terms, from the answer to `GET /terms`. A self-hosted
 * instance (REGISTRY__TERMS_ENFORCED=false) answers 404 on every terms route. Unknown
 * (still loading, or another error) is `undefined`, and callers treat it as enforced:
 * the console never skips terms on a mere network error.
 */
export function termsEnforcedFrom(state: { loaded: boolean; errorStatus: number | undefined }): boolean | undefined {
  if (state.loaded) return true;
  if (state.errorStatus === 404) return false;
  return undefined;
}
