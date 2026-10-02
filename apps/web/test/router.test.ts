import assert from "node:assert/strict";
import test from "node:test";
import { href, routes } from "../src/router/router.ts";

test("href fills $params from the frozen route map", () => {
  assert.equal(href(routes.device, { deviceUuid: "abc" }), "/console/devices/abc");
  assert.equal(href(routes.mesh, { meshId: "hill" }), "/console/meshes/hill");
});

test("sources sits under the console, after blueprints", () => {
  assert.equal(routes.sources, "/console/sources");
  assert.equal(routes.consoleChild.sources, "sources");
});

test("operator requests match the link in the backend's email", () => {
  assert.equal(href(routes.operatorRequest, { requestId: "abc" }), "/console/operator-requests/abc");
});
