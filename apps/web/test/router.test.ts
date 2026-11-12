import assert from "node:assert/strict";
import test from "node:test";
import { fillPath } from "@mtt/contracts/site";
import { routes } from "../src/router/router.ts";

test("fillPath fills $params and leaves a param it was not given", () => {
  assert.equal(fillPath(routes.device, { deviceUuid: "abc" }), "/console/devices/abc");
  assert.equal(fillPath("/console/devices/$deviceUuid/$other", { deviceUuid: "abc" }), "/console/devices/abc/$other");
});

test("operator requests match the link in the backend's email", () => {
  assert.equal(fillPath(routes.operatorRequest, { requestId: "abc" }), "/console/operator-requests/abc");
});
