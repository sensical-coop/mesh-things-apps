import assert from "node:assert/strict";
import test from "node:test";
import { issueErrors, readApiError } from "../src/lib/api-errors.ts";

test("readApiError maps DRF field errors to their first message", () => {
  assert.deepEqual(readApiError({ server: ["Must be host:port.", "Other"], topic: ["Blocked."], status: 400 }), {
    status: 400,
    detail: undefined,
    fields: { server: "Must be host:port.", topic: "Blocked." },
  });
});

test("readApiError keeps detail and status apart from the fields", () => {
  assert.deepEqual(readApiError({ detail: "Failed to create the bridge", status: 502 }), {
    status: 502,
    detail: "Failed to create the bridge",
    fields: {},
  });
  assert.deepEqual(readApiError(null), { status: undefined, detail: undefined, fields: {} });
});

test("issueErrors keys zod issues by their last path segment", () => {
  assert.deepEqual(
    issueErrors([
      { path: ["body", "server"], message: "first" },
      { path: ["body", "server"], message: "second" },
      { path: [], message: "whole form" },
    ]),
    { server: "first", form: "whole form" },
  );
});

test("formLevelMessage prefers non_field_errors, then detail", async () => {
  const { formLevelMessage } = await import("../src/lib/api-errors.ts");
  assert.equal(formLevelMessage({ non_field_errors: ["Pair them"], detail: "x" }), "Pair them");
  assert.equal(formLevelMessage({ detail: "Not allowed", status: 403 }), "Not allowed");
  assert.equal(formLevelMessage({ server: ["bad"] }), undefined);
});
