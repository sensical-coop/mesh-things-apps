export const START_STEPS = [
  "welcome",
  "account",
  "check-email",
  "basics",
  "mesh",
  "register",
  "connect",
  "next-steps",
  "done",
] as const;

export type StartStep = (typeof START_STEPS)[number];

export function isStartStep(value: unknown): value is StartStep {
  return typeof value === "string" && (START_STEPS as readonly string[]).includes(value);
}

/** `mesh: "none"` covers a missing `?mesh` and a mesh the owner does not have. `gateway` is ignored when mesh is none. */
export type StartFacts = {
  session: "none" | "unverified" | "verified";
  mesh: "none" | "owned";
  gateway: "none" | "unseen" | "seen";
};

export function resolveStartStep(requested: StartStep | undefined, facts: StartFacts): StartStep {
  if (facts.session === "none") return requested === "account" ? "account" : "welcome";
  if (facts.session === "unverified") return "check-email";
  if (facts.mesh === "none") return requested === "basics" || requested === "mesh" ? requested : "basics";
  if (facts.gateway === "none") return "register";
  if (facts.gateway === "unseen") {
    return requested === "next-steps" || requested === "done" ? requested : "connect";
  }
  return requested === "connect" || requested === "next-steps" || requested === "done" ? requested : "next-steps";
}

export function previousStartStep(step: StartStep, facts: StartFacts): StartStep | undefined {
  for (let index = START_STEPS.indexOf(step) - 1; index >= 0; index -= 1) {
    const candidate = START_STEPS[index];
    if (candidate && resolveStartStep(candidate, facts) === candidate) return candidate;
  }
  return undefined;
}
