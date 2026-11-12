import type { SourceRead } from "@mtt/contracts";

/** Bridge states the status chip and mesh status both understand. Anything else is unknown. */
const SOURCE_STATUSES = ["connected", "disconnected", "paused"] as const;

export type SourceStatus = (typeof SOURCE_STATUSES)[number];

export function sourceStatus(status: string): SourceStatus | undefined {
  return SOURCE_STATUSES.find((known) => known === status);
}

export function sourceTitle(source: Pick<SourceRead, "label" | "server" | "topic">): string {
  return source.label?.trim() || `${source.server} ${source.topic}`;
}

