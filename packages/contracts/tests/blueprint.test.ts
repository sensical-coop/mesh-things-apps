import { describe, expect, it } from "vitest";
import { validateBlueprintVersion, type BlueprintAlgorithm, type BlueprintStepCheck } from "../src/blueprint";

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

describe("validateBlueprintVersion", () => {
  it("refuses a non-pointwise algorithm and a repeated step key", () => {
    const errors = validateBlueprintVersion([reading], [step({ function_name: "roll" }), step({ order: 2 })], (name) =>
      name === "roll" ? rolling : pointwise,
    );
    expect(errors).toContain("Step 'scale': 'roll' is rolling, only pointwise algorithms can run");
    expect(errors).toContain("Step key 'scale' is used twice");
  });
});
