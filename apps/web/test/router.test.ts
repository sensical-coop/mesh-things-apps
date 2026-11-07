import assert from "node:assert/strict";
import test from "node:test";
import { href, routes } from "../src/router/router.ts";

test("href fills $params and leaves a param it was not given", () => {
  assert.equal(href(routes.device, { deviceUuid: "abc" }), "/console/devices/abc");
  assert.equal(href("/console/devices/$deviceUuid/$other", { deviceUuid: "abc" }), "/console/devices/abc/$other");
});

test("operator requests match the link in the backend's email", () => {
  assert.equal(href(routes.operatorRequest, { requestId: "abc" }), "/console/operator-requests/abc");
});
