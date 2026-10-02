/** What a sink can send, in the order the API stores it. */
export const SINK_STREAMS = ["decoded", "derived", "alarms"] as const;
export type SinkStream = (typeof SINK_STREAMS)[number];

/**
 * Readings a third party subscribes to on this instance's broker, from the meshes and
 * devices an operator attaches.
 */
export type Sink = {
  id: string;
  label: string | null;
  streams: SinkStream[];
  /** Meshes whose every node is sent, including nodes that appear later. */
  meshIds: string[];
  /** Registrations (`uuid`) of single devices. */
  deviceIds: string[];
  /** The consumer's password: shown once when set, never returned afterwards. */
  password: string;
  createdById: string | null;
  termsAcceptedVersion: string | null;
  termsExpiresAt: string | null;
  pausedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SinkWrite = Partial<Pick<Sink, "label" | "streams" | "meshIds" | "deviceIds">>;

/** Mirrors the API's validate_streams: known streams only, in their canonical order, without repeats. */
export function orderStreams(streams: readonly string[]): SinkStream[] {
  return SINK_STREAMS.filter((stream) => streams.includes(stream));
}
