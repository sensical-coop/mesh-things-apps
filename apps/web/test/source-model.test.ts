import assert from "node:assert/strict";
import test from "node:test";
import {
  canManageSources,
  normalizeRoot,
  sourceTitle,
  validateSourceFields,
} from "../src/features/source/model.ts";

test("canManageSources is for operators and superusers, never while me loads", () => {
  assert.equal(canManageSources({ is_superuser: false, role: "operator" }), true);
  assert.equal(canManageSources({ is_superuser: true, role: "member" }), true);
  assert.equal(canManageSources({ is_superuser: false, role: "member" }), false);
  assert.equal(canManageSources(undefined), false);
});

test("validateSourceFields mirrors the API's host:port, root and qos rules", () => {
  assert.deepEqual(validateSourceFields({ server: "mqtt.meshtastic.org:1883", root: "msh/EU_868", qos: 1 }), {});
  assert.deepEqual(validateSourceFields({ server: "mqtt.meshtastic.org", root: "msh/#", qos: 2 }), {
    server: "Must be host:port.",
    root: "Must be a literal topic prefix, without wildcards or empty levels.",
    qos: "Must be 0 or 1.",
  });
  assert.equal(validateSourceFields({ server: "host:0", root: "a/b", qos: 0 }).server, "Must be host:port.");
  assert.equal(validateSourceFields({ server: "host:1883", root: "msh", qos: 0 }).root, "Must have at least two levels, such as msh/EU_868.");
  assert.equal(
    validateSourceFields({ server: "host:1883", root: "msh/EU_868/2/e", qos: 0 }).root,
    "Give only the part before /2/e, such as msh/EU_868.",
  );
  assert.deepEqual(validateSourceFields({ server: "host:1883", root: " msh/EU_868/ ", qos: 0 }), {});
});

test("normalizeRoot trims and drops trailing slashes, as the API does", () => {
  assert.equal(normalizeRoot(" msh/EU_868/ES// "), "msh/EU_868/ES");
});

test("sourceTitle falls back to server and root", () => {
  assert.equal(sourceTitle({ label: "EU public", server: "a:1", root: "msh/EU_868" }), "EU public");
  assert.equal(sourceTitle({ label: "  ", server: "a:1", root: "msh/EU_868" }), "a:1 msh/EU_868");
});
