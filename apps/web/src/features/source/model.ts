import type { SourceRead } from "@mtt/contracts";
import { termsStanding, type TermsStanding } from "../terms/model.ts";

export function sourceTermsStanding(
  source: Pick<SourceRead, "terms_accepted_version" | "terms_expires_at" | "paused_at">,
  currentVersion: string | undefined,
  now: Date,
): TermsStanding {
  return termsStanding({
    acceptedVersion: source.terms_accepted_version,
    expiresAt: source.terms_expires_at,
    pausedAt: source.paused_at,
    currentVersion,
    now,
  });
}

export function sourceTitle(source: Pick<SourceRead, "label" | "server" | "topic">): string {
  return source.label?.trim() || `${source.server} ${source.topic}`;
}

