import assert from "node:assert/strict";
import test from "node:test";
import { versionErrors } from "../src/features/blueprint/validate.ts";

const step = {
  key: "cal",
  order: 1,
  function_name: "offset_scale",
  inputs: { value: "slot:reading" },
  params: {},
  outputs: { calibrated: "out" },
};

test("step problems are listed on that step, under function_name", () => {
  const errors = versionErrors(
    [{ slot: "reading" }],
    [
      {
        ...step,
        inputs: { value: "slot:reading", extra: "slot:reading" },
        params: { scale: 2 },
        outputs: { calibrated: "out", other: "nope" },
      },
    ],
  );
  const steps = errors?.steps;
  assert.ok(Array.isArray(steps) && steps.length === 1);
  const messages = (steps[0] as { function_name?: unknown }).function_name;
  assert.ok(Array.isArray(messages));
  const text = messages.join("\n");
  for (const name of ["extra", "scale", "other"]) {
    assert.match(text, new RegExp(`\\b${name}\\b`));
  }
  assert.equal(messages.length, 3);
});

test("a repeated order is one version-level error, and a valid step is none", () => {
  assert.equal(versionErrors([{ slot: "reading" }], [step]), null);
  const errors = versionErrors([{ slot: "reading" }], [step, { ...step, key: "again" }]);
  assert.ok(Array.isArray(errors?.steps));
  assert.deepEqual(
    errors.steps.map((entry: unknown) => typeof entry),
    ["string"],
  );
});
