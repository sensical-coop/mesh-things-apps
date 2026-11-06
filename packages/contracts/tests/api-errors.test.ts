import { describe, expect, it } from "vitest";
import { classifySignupFailure, formLevelMessage, issueErrors, readApiError } from "../src/api-errors";

describe("readApiError", () => {
  it("maps DRF field errors to their first message", () => {
    expect(readApiError({ server: ["Must be host:port.", "Other"], topic: ["Blocked."], status: 400 })).toEqual({
      status: 400,
      detail: undefined,
      retryAfter: undefined,
      fields: { server: "Must be host:port.", topic: "Blocked." },
    });
  });

  it("keeps detail and status apart from the fields", () => {
    expect(readApiError({ detail: "Failed to create the bridge", status: 502 })).toEqual({
      status: 502,
      detail: "Failed to create the bridge",
      retryAfter: undefined,
      fields: {},
    });
    expect(readApiError(null)).toEqual({ status: undefined, detail: undefined, retryAfter: undefined, fields: {} });
  });

  it("reads DRF's throttle wait from a 429", () => {
    const error = { status: 429, detail: "Request was throttled. Expected available in 120 seconds." };
    expect(readApiError(error).retryAfter).toBe(120);
  });

  it("has no wait when the 429 doesn't say one, or the failure isn't a throttle", () => {
    expect(readApiError({ status: 429, detail: "Slow down." }).retryAfter).toBeUndefined();
    expect(readApiError({ status: 400, detail: "Expected available in 5 seconds." }).retryAfter).toBeUndefined();
  });
});

describe("classifySignupFailure", () => {
  it("reads a throttle, including the wait the API named", () => {
    expect(
      classifySignupFailure({ status: 429, detail: "Request was throttled. Expected available in 120 seconds." }),
    ).toEqual({ kind: "throttled", retryAfter: 120 });
    expect(classifySignupFailure({ status: 429, detail: "Slow down." })).toEqual({
      kind: "throttled",
      retryAfter: undefined,
    });
  });

  it("treats 409 or an email field that says the address exists as a taken email", () => {
    expect(classifySignupFailure({ status: 409, detail: "Conflict" })).toEqual({ kind: "duplicateEmail" });
    expect(classifySignupFailure({ status: 400, email: ["owner with this email already exists."] })).toEqual({
      kind: "duplicateEmail",
    });
    expect(classifySignupFailure({ status: 400, detail: "That email already exists." })).toEqual({ kind: "generic" });
  });

  it("returns the first message of each signup field, or nothing when the body says no more", () => {
    expect(
      classifySignupFailure({ password: ["Too short.", "Also weak."], name: ["Required."], status: 400 }),
    ).toEqual({ kind: "field", message: "Too short. Required." });
    expect(classifySignupFailure({ status: 400, email: ["Enter a valid email address."] })).toEqual({
      kind: "field",
      message: "Enter a valid email address.",
    });
    expect(
      classifySignupFailure({ status: 400, detail: "Could not create the account. Check the details and try again." }),
    ).toEqual({ kind: "generic" });
  });
});

describe("issueErrors", () => {
  it("keys zod issues by their last path segment", () => {
    expect(
      issueErrors([
        { path: ["body", "server"], message: "first" },
        { path: ["body", "server"], message: "second" },
        { path: [], message: "whole form" },
      ]),
    ).toEqual({ server: "first", form: "whole form" });
  });
});

describe("formLevelMessage", () => {
  it("prefers non_field_errors, then detail", () => {
    expect(formLevelMessage({ non_field_errors: ["Pair them"], detail: "x" })).toBe("Pair them");
    expect(formLevelMessage({ detail: "Not allowed", status: 403 })).toBe("Not allowed");
    expect(formLevelMessage({ server: ["bad"] })).toBeUndefined();
  });
});
