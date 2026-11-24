import { visibleOperated } from "@mtt/contracts/authz";
import { brokerHostPort, validateSource } from "@mtt/contracts/source";
import type { Source } from "@mtt/domain/source/Source";
import type { Actor } from "../../auth";
import type { Store } from "../../store";

/**
 * Host of `host:port`. `own` is this instance (`localhost` / `emqx`), `invalid` is an
 * unreachable `*.invalid` host, `offline` is an `offline.*` host the bridge can't reach.
 */
export function brokerHost(server: string): { own: boolean; invalid: boolean; offline: boolean } {
  const { host } = brokerHostPort(server.trim());
  const lower = host.toLowerCase();
  return {
    own: lower === "localhost" || lower === "emqx",
    invalid: host.endsWith(".invalid"),
    offline: host.startsWith("offline."),
  };
}

/** Mirrors SourceSerializer: a password needs a username, also once an edit removes it. */
export function credentialErrors(username: string | null | undefined, password: string | null | undefined): Record<string, string[]> {
  return password && !username ? { username: ["A password needs a username."] } : {};
}

// Mirrors REGISTRY__SOURCES_BLOCKED_TOPICS left blank, which blocks `#`.
const SOURCES_BLOCKED_TOPICS = new Set(["#"]);

/** The server-side source checks, including the ones only the API can make. */
export function sourceErrors(input: Partial<Pick<Source, "server" | "topic" | "qos">>): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  for (const [key, message] of Object.entries(validateSource(input))) errors[key] = [message];
  if (!errors.server && input.server && brokerHost(input.server).own) {
    errors.server = ["A source cannot point at this instance's own broker."];
  }
  if (!errors.topic && input.topic !== undefined && SOURCES_BLOCKED_TOPICS.has(input.topic.trim())) {
    errors.topic = ["This topic filter is not allowed as a source."];
  }
  return errors;
}

/** Stands in for EMQX: a `.invalid` host fails the bridge, as an unreachable EMQX API would. */
export function bridgeFails(source: Pick<Source, "server">): boolean {
  return brokerHost(source.server).invalid;
}

export async function sourceForOperator(db: Store, actor: Actor, sourceId: string): Promise<Source | null> {
  const source = await db.sources.get(sourceId);
  return source && visibleOperated(actor, [source]).length > 0 ? source : null;
}

export async function canAttachSource(db: Store, actor: Actor, sourceId: string, current: string | null): Promise<boolean> {
  return sourceId === current || (await sourceForOperator(db, actor, sourceId)) !== null;
}
