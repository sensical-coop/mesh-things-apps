import assert from "node:assert/strict";
import test from "node:test";
import {
  canManageSources,
  sourceTitle,
  validateSourceFields,
} from "../src/features/source/model.ts";

test("canManageSources is for operators and superusers, never while me loads", () => {
  assert.equal(canManageSources({ is_superuser: false, role: "operator" }), true);
  assert.equal(canManageSources({ is_superuser: true, role: "member" }), true);
  assert.equal(canManageSources({ is_superuser: false, role: "member" }), false);
  assert.equal(canManageSources(undefined), false);
});

test("validateSourceFields mirrors the API's host:port, topic and qos rules", () => {
  assert.deepEqual(validateSourceFields({ server: "mqtt.meshtastic.org:1883", topic: "msh/#", qos: 1 }), {});
  assert.deepEqual(validateSourceFields({ server: "mqtt.meshtastic.org", topic: "$SYS/#", qos: 2 }), {
    server: "Must be host:port.",
    topic: "Must be a plain topic filter; $share and $SYS topics are not accepted.",
    qos: "Must be 0 or 1.",
  });
  assert.equal(validateSourceFields({ server: "host:0", topic: "a", qos: 0 }).server, "Must be host:port.");
  assert.equal(validateSourceFields({ server: "host:1883", topic: "", qos: 0 }).topic !== undefined, true);
});

test("sourceTitle falls back to server and topic", () => {
  assert.equal(sourceTitle({ label: "EU public", server: "a:1", topic: "t" }), "EU public");
  assert.equal(sourceTitle({ label: "  ", server: "a:1", topic: "t/#" }), "a:1 t/#");
});
