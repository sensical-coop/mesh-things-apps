import assert from "node:assert/strict";
import test from "node:test";
import type { Algorithm } from "@mtt/contracts";
import {
  canAttachBlueprint,
  canEditBlueprint,
  draftFromVersion,
  draftProblems,
  emptyDraft,
  paramValues,
  refChoices,
  stepForAlgorithm,
  versionBody,
} from "../src/features/blueprint/model.ts";
import { versionOutputFields } from "../src/features/postprocessing/model.ts";

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
  assert.deepEqual(kinds.sort(), ["inputUnset", "noOutput", "paramRequired", "slotName", "slotUnused", "slotUnused"].sort());
});

test("draftProblems keeps every validator code, including ones the old parser dropped", () => {
  const draft = draftFromVersion(NO2_V2);
  const ppb = draft.steps[0];
  assert.ok(ppb);
  const unknown = new Set(
    draftProblems(
      {
        ...draft,
        steps: [
          { ...ppb, key: "Bad", functionName: "nope" },
          { ...ppb, id: "again", key: "Bad" },
        ],
      },
      [EC_SENSOR],
    ).map((problem) => problem.kind),
  );
  assert.equal(unknown.has("unknownAlgorithm"), true);
  assert.equal(unknown.has("stepKey"), true);
  assert.equal(unknown.has("stepKeyTwice"), true);

  const extra = new Set(
    draftProblems(
      {
        ...draft,
        steps: [
          {
            ...ppb,
            inputs: { ...ppb.inputs, extra: "slot:working" },
            params: { sensitivity: "1" },
            outputs: { concentration_ppb: "no2", other: "x" },
          },
        ],
      },
      [EC_SENSOR],
    ).map((problem) => problem.kind),
  );
  assert.equal(extra.has("extraInput"), true);
  assert.equal(extra.has("calibrationParam"), true);
  assert.equal(extra.has("extraOutput"), true);
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

test("blueprint access is false without a signed-in user", () => {
  const orphan = { owner_id: null, is_public: true };
  assert.equal(canAttachBlueprint(orphan, "someone-else", undefined), false);
  assert.equal(canEditBlueprint(orphan, undefined), false);
});
