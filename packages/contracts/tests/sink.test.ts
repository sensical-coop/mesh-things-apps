import { describe, expect, it } from "vitest";
import { orderStreams } from "../src/sink";

describe("orderStreams", () => {
  it("keeps known streams in the API's order, once each", () => {
    expect(orderStreams(["alarms", "decoded", "alarms", "bogus"])).toEqual(["decoded", "alarms"]);
    expect(orderStreams(new Set(["derived"]))).toEqual(["derived"]);
    expect(orderStreams([])).toEqual([]);
  });
});
