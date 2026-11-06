import assert from "node:assert/strict";
import test from "node:test";
import { isStartStep, previousStartStep, resolveStartStep, type StartFacts, type StartStep } from "../src/start-step.ts";

const facts = (patch: Partial<StartFacts>): StartFacts => ({
  session: "verified",
  mesh: "owned",
  gateway: "seen",
  ...patch,
});

test("isStartStep accepts only the step ids", () => {
  assert.equal(isStartStep("welcome"), true);
  assert.equal(isStartStep("done"), true);
  assert.equal(isStartStep("next"), false);
  assert.equal(isStartStep(1), false);
});

test("session none stays on welcome unless account was requested", () => {
  assert.equal(resolveStartStep(undefined, facts({ session: "none" })), "welcome");
  assert.equal(resolveStartStep("welcome", facts({ session: "none" })), "welcome");
  assert.equal(resolveStartStep("account", facts({ session: "none" })), "account");
  assert.equal(resolveStartStep("basics", facts({ session: "none", mesh: "owned" })), "welcome");
});

test("unverified clamps to check-email", () => {
  for (const step of [undefined, "welcome", "done"] as const) {
    assert.equal(resolveStartStep(step, facts({ session: "unverified", mesh: "owned", gateway: "seen" })), "check-email");
  }
});

test("verified without a mesh stays on basics or mesh", () => {
  const none = facts({ mesh: "none", gateway: "seen" });
  assert.equal(resolveStartStep(undefined, none), "basics");
  assert.equal(resolveStartStep("basics", none), "basics");
  assert.equal(resolveStartStep("mesh", none), "mesh");
  assert.equal(resolveStartStep("welcome", none), "basics");
  assert.equal(resolveStartStep("register", none), "basics");
  assert.equal(resolveStartStep("connect", none), "basics");
});

test("owned mesh without a gateway clamps to register", () => {
  const row = facts({ gateway: "none" });
  for (const step of [undefined, "basics", "mesh", "connect", "done"] as Array<StartStep | undefined>) {
    assert.equal(resolveStartStep(step, row), "register");
  }
  assert.equal(resolveStartStep("register", row), "register");
});

test("unseen gateway is connect, and next-steps or done may skip", () => {
  const row = facts({ gateway: "unseen" });
  assert.equal(resolveStartStep(undefined, row), "connect");
  assert.equal(resolveStartStep("connect", row), "connect");
  assert.equal(resolveStartStep("register", row), "connect");
  assert.equal(resolveStartStep("next-steps", row), "next-steps");
  assert.equal(resolveStartStep("done", row), "done");
});

test("seen gateway stays on connect, next-steps, or done", () => {
  const row = facts({ gateway: "seen" });
  assert.equal(resolveStartStep(undefined, row), "next-steps");
  assert.equal(resolveStartStep("basics", row), "next-steps");
  assert.equal(resolveStartStep("register", row), "next-steps");
  assert.equal(resolveStartStep("connect", row), "connect");
  assert.equal(resolveStartStep("next-steps", row), "next-steps");
  assert.equal(resolveStartStep("done", row), "done");
});

test("previousStartStep skips steps the facts would move past", () => {
  assert.equal(previousStartStep("account", facts({ session: "none" })), "welcome");
  assert.equal(previousStartStep("welcome", facts({ session: "none" })), undefined);
  assert.equal(previousStartStep("mesh", facts({ mesh: "none" })), "basics");
  assert.equal(previousStartStep("basics", facts({ mesh: "none" })), undefined);
  assert.equal(previousStartStep("register", facts({ gateway: "none" })), undefined);
  assert.equal(previousStartStep("connect", facts({ gateway: "unseen" })), undefined);
  assert.equal(previousStartStep("next-steps", facts({ gateway: "unseen" })), "connect");
  assert.equal(previousStartStep("done", facts({ gateway: "unseen" })), "next-steps");
});
