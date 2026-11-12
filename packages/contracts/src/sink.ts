import { StreamsEnum } from "./generated/model.zod";

/** What a sink can send, in the order the API stores it. */
export const SINK_STREAMS = StreamsEnum.options;
export type SinkStream = StreamsEnum;

/** Known streams only, in their canonical order, without repeats. Mirrors the API's validate_streams. */
export function orderStreams(streams: Iterable<string>): SinkStream[] {
  const wanted = new Set(streams);
  return SINK_STREAMS.filter((stream) => wanted.has(stream));
}
