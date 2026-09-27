import assert from "node:assert/strict";
import test from "node:test";
import type { Algorithm } from "@mtt/contracts";
import {
  canAttachBlueprint,
  canEditBlueprint,
  draftFromVersion,
  draftProblems,
  emptyDraft,
  errorMessages,
  paramValues,
  parseRef,
  refChoices,
  stepForAlgorithm,
  versionBody,
  versionOutputFields,
} from "../src/features/blueprint/model.ts";

const EC_SENSOR: Algorithm = {
  name: "ec_sensor_ppb",
  inputs: ["working", "auxiliary", "temperature"],
  outputs: ["concentration_ppb"],
  params: [
    { name: "sensitivity", calibration: true, required: true, default: null, unit: "mV/ppb", doc: "" },
    { name: "temperature_coefficient", calibration: false, required: false, default: 0, unit: "1/degC", doc: "" },
  ],
  mode: "pointwise",
  doc: null,
  output_units: { concentration_ppb: "ppb" },
};

const PPB_TO_UGM3: Algorithm = {
  name: "ppb_to_ugm3",
  inputs: ["concentration_ppb", "temperature"],
  outputs: ["concentration_ugm3"],
  params: [{ name: "molecular_weight", calibration: false, required: true, default: null, unit: "g/mol", doc: "" }],
  mode: "pointwise",
  doc: null,
  output_units: { concentration_ugm3: "ug/m3" },
};

const NO2_V2 = {
  inputs: [
    { slot: "working", default_channel: "ads1115.channel_0" },
    { slot: "auxiliary", default_channel: "ads1115.channel_1" },
    { slot: "temperature", default_channel: "environment_metrics.temperature" },
  ],
  steps: [
    {
      key: "ugm3",
      order: 1,
      function_name: "ppb_to_ugm3",
      inputs: { concentration_ppb: "step:ppb.concentration_ppb", temperature: "slot:temperature" },
      params: { molecular_weight: 46.01 },
      outputs: { concentration_ugm3: "no2_ugm3" },
    },
    {
      key: "ppb",
      order: 0,
      function_name: "ec_sensor_ppb",
      inputs: { working: "slot:working", auxiliary: "slot:auxiliary", temperature: "slot:temperature" },
      params: { temperature_coefficient: 0.01 },
      outputs: { concentration_ppb: "no2_ppb" },
    },
  ],
};

test("parseRef reads slot and step references", () => {
  assert.deepEqual(parseRef("slot:working"), { kind: "slot", slot: "working" });
  assert.deepEqual(parseRef("step:ppb.concentration_ppb"), { kind: "step", key: "ppb", output: "concentration_ppb" });
  assert.equal(parseRef("ads1115.channel_0"), null);
});

test("a version round-trips through a draft, steps in order", () => {
  const draft = draftFromVersion(NO2_V2);
  assert.deepEqual(draft.steps.map((step) => step.key), ["ppb", "ugm3"]);
  assert.equal(draft.steps[1]?.params.molecular_weight, "46.01");
  const body = versionBody(draft);
  assert.deepEqual(body.steps.map((step) => [step.key, step.order]), [["ppb", 0], ["ugm3", 1]]);
  assert.deepEqual(body.steps[1]?.params, { molecular_weight: 46.01 });
  assert.deepEqual(body.inputs[0], { slot: "working", default_channel: "ads1115.channel_0" });
  assert.deepEqual(draftProblems(draft, [EC_SENSOR, PPB_TO_UGM3]), []);
  assert.deepEqual(versionOutputFields(NO2_V2), ["no2_ppb", "no2_ugm3"]);
});

test("a step reads slots and earlier steps only", () => {
  const draft = draftFromVersion(NO2_V2);
  assert.deepEqual(refChoices(draft, 0).map((choice) => choice.value), ["slot:working", "slot:auxiliary", "slot:temperature"]);
  assert.ok(refChoices(draft, 1).some((choice) => choice.value === "step:ppb.concentration_ppb"));
});

test("draftProblems catches what the registry refuses", () => {
  assert.deepEqual(draftProblems(emptyDraft(), []), [{ kind: "noSteps" }]);
  const draft = draftFromVersion(NO2_V2);
  const [ppb, ugm3] = draft.steps;
  assert.ok(ppb && ugm3);
  const broken = {
    ...draft,
    slots: [...draft.slots, { id: "x", slot: "Unused", defaultChannel: "" }, { id: "y", slot: "spare", defaultChannel: "" }],
    steps: [{ ...ppb, outputs: { concentration_ppb: "" } }, { ...ugm3, params: {} }],
  };
  const kinds = draftProblems(broken, [EC_SENSOR, PPB_TO_UGM3]).map((problem) => problem.kind);
  assert.deepEqual(kinds.sort(), ["inputUnset", "noOutput", "paramRequired", "slotName", "slotUnused"].sort());
});

test("a new step reads slots named after its inputs, with a free key", () => {
  const step = stepForAlgorithm(EC_SENSOR, ["ec_sensor_ppb"]);
  assert.equal(step.key, "ec_sensor_ppb_2");
  assert.equal(step.inputs.working, "slot:working");
  assert.deepEqual(step.outputs, { concentration_ppb: "concentration_ppb" });
});

test("typed params: blank falls back to the default, JSON parses, text stays text", () => {
  assert.deepEqual(paramValues({ a: " ", b: "0.42", c: "[[0, 0], [1, 2]]", d: "abc" }), {
    b: 0.42,
    c: [
      [0, 0],
      [1, 2],
    ],
    d: "abc",
  });
});

test("errorMessages flattens DRF's nested and bare-list bodies", () => {
  assert.deepEqual(errorMessages({ steps: [{}, { function_name: ["bad input"] }], status: 400 }), ["bad input"]);
  assert.deepEqual(errorMessages({ non_field_errors: ["cycle"], status: 400 }), ["cycle"]);
});

test("blueprint access mirrors the registry", () => {
  const mine = { owner_id: "me", is_public: false };
  const orphan = { owner_id: null, is_public: true };
  assert.equal(canEditBlueprint(mine, { id: "me", is_superuser: false }), true);
  assert.equal(canEditBlueprint(orphan, { id: "me", is_superuser: false }), false);
  assert.equal(canEditBlueprint(orphan, { id: "admin", is_superuser: true }), true);
  assert.equal(canAttachBlueprint(mine, "me", { is_superuser: false }), true);
  assert.equal(canAttachBlueprint(mine, "someone-else", { is_superuser: false }), false);
  assert.equal(canAttachBlueprint(orphan, "someone-else", { is_superuser: false }), true);
});
