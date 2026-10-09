import assert from "node:assert/strict";
import test from "node:test";
import {
  newDevices,
  nodeHex,
  pairLinks,
  routeCoordinates,
  snrStrength,
  portnumLabel,
  totalTraffic,
  trafficNodeLabel,
  windowMs,
} from "../src/features/mesh-network/model.ts";

test("windowMs reads the API's bucket sizes", () => {
  assert.equal(windowMs("1m"), 60_000);
  assert.equal(windowMs("15m"), 900_000);
  assert.equal(windowMs("6h"), 21_600_000);
  assert.equal(windowMs("soon"), null);
});

test("totalTraffic sums every payload kind per bucket, oldest first", () => {
  const traffic = [
    {
      portnum: 67,
      name: "TELEMETRY_APP",
      packets: 5,
      receptions: 5,
      points: [
        { time: "2026-10-01T01:00:00Z", value: 2 },
        { time: "2026-10-01T00:00:00Z", value: 3 },
      ],
    },
    {
      portnum: 3,
      name: "POSITION_APP",
      packets: 1,
      receptions: 1,
      points: [{ time: "2026-10-01T00:00:00Z", value: 1 }],
    },
  ];
  assert.deepEqual(totalTraffic(traffic), [
    { time: "2026-10-01T00:00:00Z", value: 4 },
    { time: "2026-10-01T01:00:00Z", value: 2 },
  ]);
});

test("portnumLabel turns the Meshtastic name into words", () => {
  assert.equal(portnumLabel("TEXT_MESSAGE_APP"), "text message");
  assert.equal(portnumLabel("ENCRYPTED"), "encrypted");
  assert.equal(portnumLabel("PORTNUM_300"), "portnum 300");
});

test("trafficNodeLabel names registered nodes and falls back to the hex node ID", () => {
  const device = { uuid: "u1", name: "Hilltop" } as never;
  const devices = new Map([["u1", device]]);
  const title = (d: { name: string | null }) => d.name ?? "";
  assert.equal(trafficNodeLabel({ node_id: 1, device_uuid: "u1" }, devices, title), "Hilltop");
  assert.equal(trafficNodeLabel({ node_id: 0x1a2b3c4d, device_uuid: null }, devices, title), "!1a2b3c4d");
});

const link = (from_node: number, to_node: number, overrides: Record<string, unknown> = {}) =>
  ({
    from_node,
    to_node,
    from_device_uuid: null,
    to_device_uuid: null,
    source: "traceroute",
    samples: 1,
    snr_mean: 2,
    last_snr: 2,
    first_seen: "2026-10-01T00:00:00Z",
    last_seen: "2026-10-01T00:00:00Z",
    distance_km: null,
    ...overrides,
  }) as never;

test("pairLinks merges both directions and every source into one pair, longest first", () => {
  const pairs = pairLinks([
    link(1, 2, { snr_mean: 3, samples: 2, distance_km: 1.5 }),
    link(2, 1, { snr_mean: 6, samples: 1, source: "direct", last_seen: "2026-10-02T00:00:00Z", distance_km: 1.5 }),
    link(3, 4, { distance_km: 9 }),
    link(5, 6),
  ]);

  assert.deepEqual(
    pairs.map((p) => p.key),
    ["3-4", "1-2", "5-6"],
  );
  assert.deepEqual(pairs[1], {
    key: "1-2",
    a: 1,
    b: 2,
    snr: 6,
    samples: 3,
    sources: ["traceroute", "direct"],
    distanceKm: 1.5,
    lastSeen: "2026-10-02T00:00:00Z",
  });
});

test("snrStrength clamps to the decodable range", () => {
  assert.equal(snrStrength(-20), 0);
  assert.equal(snrStrength(-2.5), 0.5);
  assert.equal(snrStrength(15), 1);
});

test("routeCoordinates keeps only positioned nodes, in order", () => {
  const positions = new Map<number, [number, number]>([
    [1, [2.1, 41.3]],
    [3, [2.2, 41.4]],
  ]);
  assert.deepEqual(routeCoordinates([1, 2, 3], positions), [
    [2.1, 41.3],
    [2.2, 41.4],
  ]);
});

test("newDevices counts discovery, or registration when not discovered", () => {
  const now = Date.parse("2026-10-08T00:00:00Z");
  const devices = [
    { created_at: "2026-10-07T12:00:00Z", discovered_at: null },
    { created_at: "2026-01-01T00:00:00Z", discovered_at: "2026-10-07T20:00:00Z" },
    { created_at: "2026-10-01T00:00:00Z", discovered_at: null },
  ] as never[];
  assert.equal(newDevices(devices, 86_400_000, now), 2);
});

test("nodeHex pads to eight digits", () => {
  assert.equal(nodeHex(0xabcd), "!0000abcd");
});
