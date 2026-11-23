import assert from "node:assert/strict";
import test from "node:test";
import { airPacket, airRings } from "../src/figures/parts/air-waves.ts";
import { LORA_CASE, antennaPoint } from "../src/figures/parts/lora-radio.ts";

test("the antenna stands tall and follows the case's facing", () => {
  const flat = antennaPoint({ x: 0, y: 0, z: 0, facing: "x" });
  assert.ok(flat[0] <= 12 && flat[2] >= LORA_CASE.height + LORA_CASE.length * 1.6);
  const turned = antennaPoint({ x: 0, y: 0, z: 0, facing: "y" });
  assert.ok(turned[1] <= 12);
  assert.equal(turned[2], flat[2]);
});

test("an air packet arcs above its endpoints and rings are paths", () => {
  assert.ok(airPacket([0, 0], [40, 10], 16).at(0.5)[1] < 5);
  const rings = airRings([0, 0]);
  assert.equal(rings.length, 3);
  assert.ok(rings[0]?.startsWith("M"));
});
