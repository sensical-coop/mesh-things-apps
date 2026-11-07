import type { TermsLocale } from "@mtt/contracts/terms";
import { TERMS_RENEWAL_NOTICE_DAYS } from "@mtt/contracts/terms-notice";

/** A mesh, source or sink that accepted terms and can lapse. */
export type TermsEntity = {
  terms_accepted_version: string | null;
  terms_expires_at: string | null;
  paused_at: string | null;
};

/** Account terms at signup; mesh terms per mesh on the default broker; source and sink terms per source and sink. */
export type TermsKind = "account" | "mesh" | "source" | "sink";

/** What was accepted: sent back as `terms_version` and `terms_locale`. */
export type TermsAcceptance = { version: string; locale: TermsLocale };

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

/** Where a source or sink stands with the terms it accepted. */
export function entityTermsStanding(
  entity: TermsEntity,
  currentVersion: string | undefined,
  now: Date,
): TermsStanding {
  return termsStanding({
    acceptedVersion: entity.terms_accepted_version,
    expiresAt: entity.terms_expires_at,
    pausedAt: entity.paused_at,
    currentVersion,
    now,
  });
}

