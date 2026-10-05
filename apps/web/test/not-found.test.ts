import assert from "node:assert/strict";
import test from "node:test";
import { isNotFound } from "@tanstack/react-router";
import { isNotFoundError, isUuid, requireUuid } from "../src/lib/not-found.ts";

const id = "3f2b8c1e-7a4d-4c2e-9b1a-0d6e5f4a3b2c";

test("isUuid accepts what the request validator accepts, and nothing else", () => {
  assert.equal(isUuid(id), true);
  assert.equal(isUuid("hill"), false);
  assert.equal(isUuid(`${id}x`), false);
  assert.equal(isUuid(""), false);
});

test("requireUuid throws the router's notFound for a malformed id", () => {
  assert.doesNotThrow(() => requireUuid(id));
  assert.throws(() => requireUuid("hill"), (error) => isNotFound(error));
});

test("isNotFoundError reads the status attached to a failed request", () => {
  assert.equal(isNotFoundError({ detail: "No Mesh matches the given query.", status: 404 }), true);
  assert.equal(isNotFoundError({ detail: "Forbidden", status: 403 }), false);
  assert.equal(isNotFoundError(null), false);
});
