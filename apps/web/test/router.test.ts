import assert from "node:assert/strict";
import test from "node:test";
import { href, routes } from "../src/router/router.ts";

test("href fills $params from the frozen route map", () => {
  assert.equal(href(routes.device, { deviceUuid: "abc" }), "/console/devices/abc");
  assert.equal(href(routes.mesh, { meshId: "hill" }), "/console/meshes/hill");
});
