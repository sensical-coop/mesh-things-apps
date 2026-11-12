import { describe, expect, it } from "vitest";
import { parseRef, validateBlueprintStep, validateBlueprintVersion, type BlueprintAlgorithm, type BlueprintStepCheck } from "../src/blueprint";

const reading = { slot: "reading" };

function step(over: Partial<BlueprintStepCheck> = {}): BlueprintStepCheck {
  return {
    key: "scale",
    order: 1,
    function_name: "scale",
    inputs: { value: "slot:reading" },
    params: {},
    outputs: { scaled: "scaled" },
    ...over,
  };
}

const pointwise: BlueprintAlgorithm = {
  name: "scale",
  mode: "pointwise",
  inputs: ["value"],
  outputs: ["scaled"],
  params: [],
};

const rolling: BlueprintAlgorithm = { ...pointwise, name: "roll", mode: "rolling" };

describe("validateBlueprintStep", () => {
  it("codes an unknown algorithm, an extra input, and a calibration param", () => {
    expect(validateBlueprintStep(step({ function_name: "missing" }), undefined)).toEqual([
      { code: "unknown_algorithm", path: ["steps", "scale", "function_name"], key: "scale", name: "missing" },
    ]);
    const problems = validateBlueprintStep(
      step({ inputs: { value: "slot:reading", extra: "slot:reading" }, params: { gain: 1 } }),
      { ...pointwise, params: [{ name: "gain", calibration: true, required: true }] },
    );
    expect(problems.map((problem) => problem.code)).toEqual(["extra_inputs", "calibration_params"]);
    expect(problems[0]).toMatchObject({ inputs: ["extra"], name: "scale", key: "scale" });
    expect(problems[1]).toMatchObject({ params: ["gain"] });
  });
});

describe("validateBlueprintVersion", () => {
  it("codes a non-pointwise algorithm and a repeated step key", () => {
    const problems = validateBlueprintVersion(
      [reading],
      [step({ function_name: "roll" }), step({ order: 2 })],
      (name) => (name === "roll" ? rolling : pointwise),
    );
    expect(problems).toContainEqual(
      expect.objectContaining({ code: "not_pointwise", key: "scale", name: "roll", mode: "rolling" }),
    );
    expect(problems).toContainEqual(expect.objectContaining({ code: "step_key_twice", key: "scale" }));
  });

  it("stops at a repeated order", () => {
    expect(
      validateBlueprintVersion([reading], [step(), step({ key: "other" })], () => pointwise).map((problem) => problem.code),
    ).toEqual(["duplicate_order"]);
  });
});

describe("parseRef", () => {
  it("reads slot and step references", () => {
    expect(parseRef("slot:working")).toEqual({ kind: "slot", slot: "working" });
    expect(parseRef("step:ppb.concentration_ppb")).toEqual({ kind: "step", key: "ppb", output: "concentration_ppb" });
    expect(parseRef("ads1115.channel_0")).toBeNull();
  });
});
