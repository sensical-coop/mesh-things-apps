/** What a sink can send, in the order the API stores it. */
export const SINK_STREAMS = ["decoded", "derived", "alarms"] as const;
export type SinkStream = (typeof SINK_STREAMS)[number];

/** Known streams only, in their canonical order, without repeats. Mirrors the API's validate_streams. */
export function orderStreams(streams: Iterable<string>): SinkStream[] {
  const wanted = new Set(streams);
  return SINK_STREAMS.filter((stream) => wanted.has(stream));
}
